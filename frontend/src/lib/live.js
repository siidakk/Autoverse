// Building the same car as someone else, at the same time.
//
// A room is a code in the address bar. Send someone the link, they land on the
// same car, and from then on either of you changing anything moves it for both.
// Nothing is stored: a build already has a way to be saved, and this is for the
// two minutes spent arguing about the wheels.
//
// The rule that keeps it sane: a change arriving from the room is applied
// without being sent back out. Without that, two browsers spend the afternoon
// telling each other the same thing.

import { useCallback, useEffect, useRef, useState } from "react";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// No I, O, 0 or 1. Codes get read out loud and written down.
export function newRoomCode(length = 5) {
  let code = "";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (const value of values) code += ALPHABET[value % ALPHABET.length];
  return code;
}

function socketUrl(room) {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/live";
  url.search = `?room=${room}`;
  return url.toString();
}

/**
 * Joins `room` and keeps it in step.
 *
 * `onRemote` is called with a spec somebody else changed. It must not send
 * anything back; `send` is for local changes only.
 */
export function useLiveRoom(room, onRemote) {
  const [socketState, setSocketState] = useState("idle");
  const [peerCount, setPeerCount] = useState(0);
  const socket = useRef(null);
  const remote = useRef(onRemote);
  const retry = useRef(null);

  // Held in a ref so a changing callback does not tear the socket down and
  // rebuild it on every render. Written after the render rather than during
  // it, because a ref touched mid render can disagree with what was drawn.
  useEffect(() => {
    remote.current = onRemote;
  });

  // Derived rather than stored, so leaving a room does not need an effect
  // whose only job is to set state the moment it runs.
  const state = room ? socketState : "idle";
  const peers = room ? peerCount : 0;

  useEffect(() => {
    if (!room) return;

    let closed = false;
    let attempts = 0;

    const connect = () => {
      if (closed) return;

      setSocketState("connecting");

      let ws;
      try {
        ws = new WebSocket(socketUrl(room));
      } catch {
        setSocketState("failed");
        return;
      }

      socket.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setSocketState("connected");
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "peers") setPeerCount(message.count);
        if (message.type === "spec") remote.current?.(message.spec);
      };

      ws.onclose = () => {
        socket.current = null;
        if (closed) return;

        setSocketState("connecting");

        // Free hosting sleeps, and phones change networks. Backing off rather
        // than hammering, and giving up visibly rather than silently.
        attempts += 1;
        if (attempts > 6) {
          setSocketState("failed");
          return;
        }

        retry.current = window.setTimeout(connect, Math.min(1000 * 2 ** attempts, 15000));
      };

      ws.onerror = () => {
        // onclose always follows, and that is where the retry lives.
      };
    };

    connect();

    return () => {
      closed = true;
      window.clearTimeout(retry.current);
      socket.current?.close();
      socket.current = null;
    };
  }, [room]);

  const send = useCallback((spec) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "spec", spec }));
    }
  }, []);

  return { state, peers, send };
}
