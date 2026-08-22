// Exercises the live room against a real server on a throwaway port.
//
//   npm run test:live
//
// Two sockets, one room. What is checked is the behaviour that is easy to get
// wrong and hard to notice: that a change reaches the other person, that it is
// not echoed back to whoever made it, that rooms do not leak into each other,
// and that a peer count goes down again when somebody leaves.

import express from "express";
import { WebSocket } from "ws";
import { attachLive } from "../live.js";

const GREEN = "\x1b[32m", RED = "\x1b[31m", DIM = "\x1b[2m", OFF = "\x1b[0m";

const checks = [];
const check = (name, passed, detail = "") => checks.push({ name, passed, detail });

const app = express();
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));

const live = attachLive(server);
const port = server.address().port;

const open = (room) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/live?room=${room}`);
    ws.inbox = [];
    ws.on("message", (raw) => ws.inbox.push(JSON.parse(raw)));
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });

const settle = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

// --- one room, two people ---

const alice = await open("ABCDE");
const bob = await open("ABCDE");
await settle();

const peersSeen = [...alice.inbox, ...bob.inbox]
  .filter((m) => m.type === "peers")
  .map((m) => m.count);

check("both sockets connect", alice.readyState === 1 && bob.readyState === 1);
check("the room reports two people", peersSeen.includes(2), `saw ${peersSeen.join(", ")}`);

alice.inbox.length = 0;
bob.inbox.length = 0;

alice.send(JSON.stringify({ type: "spec", spec: { color: "#ff0000", wheelType: "sport" } }));
await settle();

const arrived = bob.inbox.find((m) => m.type === "spec");
check("a change reaches the other person", arrived?.spec?.color === "#ff0000",
  arrived ? JSON.stringify(arrived.spec) : "nothing arrived");

check("a change is not echoed to whoever made it",
  !alice.inbox.some((m) => m.type === "spec"));

// --- a different room must not hear any of it ---

const carol = await open("ZZZZZ");
await settle();
carol.inbox.length = 0;

alice.send(JSON.stringify({ type: "spec", spec: { color: "#00ff00" } }));
await settle();

check("rooms are isolated", !carol.inbox.some((m) => m.type === "spec"));

// --- rubbish is refused ---

const bad = new WebSocket(`ws://127.0.0.1:${port}/live?room=nope!`);
const refused = await new Promise((resolve) => {
  bad.on("error", () => resolve(true));
  bad.on("open", () => resolve(false));
});
check("a malformed room code is refused", refused);

const wrongPath = new WebSocket(`ws://127.0.0.1:${port}/socket?room=ABCDE`);
const pathRefused = await new Promise((resolve) => {
  wrongPath.on("error", () => resolve(true));
  wrongPath.on("open", () => resolve(false));
});
check("an upgrade on another path is refused", pathRefused);

// Oversized frames are dropped rather than parsed.
bob.inbox.length = 0;
alice.send(JSON.stringify({ type: "spec", spec: { junk: "x".repeat(9000) } }));
await settle();
check("an oversized message is ignored", !bob.inbox.some((m) => m.type === "spec"));

// --- leaving ---

bob.close();
await settle(250);

const afterLeaving = alice.inbox.filter((m) => m.type === "peers").pop();
check("the count falls when somebody leaves", afterLeaving?.count === 1,
  `count was ${afterLeaving?.count}`);

// --- report ---

console.log();
let failures = 0;
for (const { name, passed, detail } of checks) {
  if (passed) {
    console.log(`  ${GREEN}pass${OFF}  ${name}`);
  } else {
    failures++;
    console.log(`  ${RED}FAIL${OFF}  ${name}${detail ? `${DIM} — ${detail}${OFF}` : ""}`);
  }
}

console.log(
  `\n${failures ? RED : GREEN}${checks.length - failures}/${checks.length} live room checks pass${OFF}\n`
);

alice.close();
carol.close();
live.close();
server.close();

process.exit(failures ? 1 : 0);
