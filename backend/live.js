// Two people building the same car at once.
//
// A room is just a set of open sockets sharing a code. When one person changes
// the spec, everyone else in the room is told; nothing is stored, because a
// build already has a way to be saved and this is about the minute you spend
// arguing over the wheels, not about persistence.
//
// Deliberately not Socket.IO. This needs rooms and a broadcast, which is about
// forty lines of `ws`, and the fallback machinery Socket.IO exists for is not
// worth a dependency here -- Render terminates TLS and passes WebSockets
// straight through.

const { WebSocketServer } = require("ws")

// code -> Set of sockets
const rooms = new Map()

// A room nobody has spoken in for this long is forgotten. Sockets die without
// closing cleanly often enough that this matters.
const IDLE_MS = 1000 * 60 * 30

const CODE = /^[A-Z0-9]{4,10}$/

function roomOf(code) {
  if (!rooms.has(code)) rooms.set(code, { sockets: new Set(), touched: Date.now() })
  const room = rooms.get(code)
  room.touched = Date.now()
  return room
}

function announce(code) {
  const room = rooms.get(code)
  if (!room) return

  const message = JSON.stringify({ type: "peers", count: room.sockets.size })

  for (const socket of room.sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message)
  }
}

function attachLive(server) {
  // No `server` option with a path, because the same HTTP server also serves
  // the REST API; upgrades are routed by hand so anything else 404s normally.
  const wss = new WebSocketServer({ noServer: true })

  server.on("upgrade", (request, socket, head) => {
    let url
    try {
      url = new URL(request.url, `http://${request.headers.host}`)
    } catch {
      socket.destroy()
      return
    }

    if (url.pathname !== "/live") {
      socket.destroy()
      return
    }

    const code = (url.searchParams.get("room") || "").toUpperCase()

    if (!CODE.test(code)) {
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, code)
    })
  })

  wss.on("connection", (ws, request, code) => {
    const room = roomOf(code)
    room.sockets.add(ws)
    ws.isAlive = true

    announce(code)

    ws.on("pong", () => {
      ws.isAlive = true
    })

    ws.on("message", (raw) => {
      // Size capped before parsing: a spec is a few hundred bytes and there is
      // no reason to accept a megabyte of anything from a socket.
      if (raw.length > 8000) return

      let message
      try {
        message = JSON.parse(raw)
      } catch {
        return
      }

      if (message?.type !== "spec" && message?.type !== "cursor") return

      room.touched = Date.now()
      const payload = JSON.stringify(message)

      // Not echoed to the sender: they already have their own change, and
      // sending it back is how you get two browsers fighting each other.
      for (const peer of room.sockets) {
        if (peer !== ws && peer.readyState === peer.OPEN) peer.send(payload)
      }
    })

    ws.on("close", () => {
      room.sockets.delete(ws)
      if (room.sockets.size === 0) rooms.delete(code)
      else announce(code)
    })
  })

  // A socket that has gone away without saying so leaves its room looking
  // busier than it is, so every peer count would be a lie.
  const heartbeat = setInterval(() => {
    for (const [code, room] of rooms) {
      for (const socket of room.sockets) {
        if (!socket.isAlive) {
          socket.terminate()
          room.sockets.delete(socket)
          continue
        }
        socket.isAlive = false
        socket.ping()
      }

      if (room.sockets.size === 0 && Date.now() - room.touched > IDLE_MS) {
        rooms.delete(code)
      } else {
        announce(code)
      }
    }
  }, 30000)

  heartbeat.unref?.()

  return {
    rooms: () => rooms.size,
    close: () => {
      clearInterval(heartbeat)
      wss.close()
    }
  }
}

module.exports = { attachLive }
