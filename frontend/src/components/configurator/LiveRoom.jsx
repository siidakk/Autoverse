import { useState } from "react";

// Building the same car as someone else.
//
// The invitation is the address bar: start a room, send the link, and from
// then on either of you changing anything moves it for both. Nothing is
// stored -- a build already has a way to be saved, and this is for the two
// minutes spent arguing about the wheels.

const WORDING = {
  idle: "Not connected",
  connecting: "Connecting…",
  connected: "Live",
  failed: "Could not connect"
};

export default function LiveRoom({ live, room, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);

  const share = () => {
    const url = window.location.href;

    // The clipboard API needs a secure context and permission; a prompt is a
    // poor experience but a far better one than a button that does nothing.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        },
        () => window.prompt("Copy this link", url)
      );
    } else {
      window.prompt("Copy this link", url);
    }
  };

  if (!room) {
    return (
      <button type="button" onClick={onStart} className="btn btn-ghost w-full">
        Build it with someone
      </button>
    );
  }

  const connected = live.state === "connected";

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-data opacity-70" />
            )}
            <span
              className={[
                "relative inline-flex h-2 w-2 rounded-full",
                connected ? "bg-data" : live.state === "failed" ? "bg-signal" : "bg-fog"
              ].join(" ")}
            />
          </span>
          <span className="label">{WORDING[live.state] ?? live.state}</span>
        </span>

        <span className="readout text-sm tracking-[0.25em] text-chalk">{room}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fog">
        {connected
          ? live.peers > 1
            ? `${live.peers} people in this room. Anything either of you changes moves for both.`
            : "Waiting for someone else. Send them the link and this car becomes shared."
          : live.state === "failed"
            ? "The live service did not answer. The configurator still works; only sharing is off."
            : "Opening the connection."}
      </p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={share} className="btn btn-ghost flex-1">
          {copied ? "Link copied" : "Copy invite"}
        </button>
        <button type="button" onClick={onLeave} className="btn btn-ghost">
          Leave
        </button>
      </div>
    </div>
  );
}
