import { useEffect, useRef, useState } from "react";
import { THEMES, interpret } from "../../data/themes";
import { listen, supported, unavailableBecause, EXAMPLES } from "../../lib/voice";

// Describe the car you want in words and the whole specification changes at
// once. The point of showing what it matched on is that a suggestion you can
// argue with is more useful than one that simply happens to you.
export default function DesignAssistant({ onApply }) {
  const [prompt, setPrompt] = useState("");
  const [applied, setApplied] = useState(null);
  const [missed, setMissed] = useState(false);

  // --- voice ---
  const [hearing, setHearing] = useState(false);
  const [heard, setHeard] = useState("");
  const [voiceError, setVoiceError] = useState(null);
  const session = useRef(null);

  const canSpeak = supported();

  // A microphone still listening after the panel has gone is the sort of thing
  // that ends up in a news story.
  useEffect(() => () => session.current?.stop(), []);

  const run = (text) => {
    const phrase = text.trim();
    if (!phrase) return;

    const reading = interpret(phrase);

    if (!reading) {
      setMissed(true);
      setApplied(null);
      return;
    }

    setMissed(false);
    setApplied(reading);
    onApply(reading.spec);
  };

  const talk = () => {
    if (hearing) {
      session.current?.stop();
      return;
    }

    setVoiceError(null);
    setHeard("");
    setHearing(true);

    session.current = listen({
      onInterim: setHeard,
      onResult: (text) => {
        setHeard(text);
        setPrompt(text);
        run(text);
      },
      onError: (message) => {
        setVoiceError(message);
        setHearing(false);
      },
      onEnd: () => {
        setHearing(false);
        session.current = null;
      }
    });

    if (!session.current) setHearing(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="label">Describe it</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(prompt);
          }}
          className="mt-2 flex gap-px bg-line-soft"
        >
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="neon night city"
            className="field flex-1 border-0"
          />
          <button type="submit" className="btn btn-signal shrink-0 px-4">
            Build it
          </button>
        </form>

        {/* SPEAK IT
            Describing a car out loud is the natural way to do it; typing is
            the awkward part. This is the same matcher, with the keyboard
            taken away. */}
        <button
          type="button"
          onClick={talk}
          disabled={!canSpeak}
          title={canSpeak ? "Describe the car out loud" : unavailableBecause()}
          className={[
            "mt-2 flex w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-[11px] tracking-widest uppercase transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-40",
            hearing
              ? "border-signal bg-signal/10 text-signal"
              : "border-white/12 text-fog hover:border-white/25 hover:text-chalk"
          ].join(" ")}
        >
          <span className="relative flex h-2 w-2">
            {hearing && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
            )}
            <span
              className={[
                "relative inline-flex h-2 w-2 rounded-full",
                hearing ? "bg-signal" : "bg-fog"
              ].join(" ")}
            />
          </span>
          {hearing ? "Listening — say it" : "Speak it instead"}
        </button>

        {heard && (
          <p className="mt-2 text-xs leading-relaxed text-fog">
            Heard: <span className="text-chalk">{heard}</span>
          </p>
        )}

        {voiceError && (
          <p className="mt-2 text-xs leading-relaxed text-signal">{voiceError}</p>
        )}

        {canSpeak && !hearing && !heard && (
          <p className="mt-2 text-[11px] leading-relaxed text-fog">
            Try “{EXAMPLES[0]}”. Recognition is done by the browser, which on
            Chrome means Google — unlike the photo tools here, this one does
            leave the device.
          </p>
        )}
      </div>

      {/* THE THEMES THEMSELVES, FOR ANYONE WHO WOULD RATHER JUST PICK */}
      <div>
        <p className="label">Or start from one of these</p>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                setPrompt(theme.label);
                run(theme.label);
              }}
              className={[
                "border px-3 py-2.5 text-left transition-colors",
                applied?.theme.id === theme.id
                  ? "border-signal bg-signal/10"
                  : "border-line-soft bg-ink hover:border-line"
              ].join(" ")}
            >
              <span className="block text-[11px] text-chalk">{theme.label}</span>
              <span className="mt-0.5 block text-[9px] leading-tight text-fog">
                {theme.blurb}
              </span>
            </button>
          ))}
        </div>
      </div>

      {missed && (
        <p className="border border-line px-3 py-2 text-xs leading-relaxed text-fog">
          Nothing in that matched a theme. Try words about mood or use, like
          quiet, aggressive, night, luxury, trail, or a colour.
        </p>
      )}

      {applied && (
        <div className="border border-signal-deep bg-signal-deep/10 px-4 py-3">
          <p className="label text-signal">Applied {applied.theme.label}</p>

          <p className="mt-2 text-xs leading-relaxed text-fog">
            Matched on{" "}
            {applied.matched.map((word, index) => (
              <span key={word}>
                {index > 0 && ", "}
                <span className="text-chalk">{word}</span>
              </span>
            ))}
            {applied.overrodeColour && (
              <>
                {" "}— and painted it {" "}
                <span className="text-chalk">{applied.overrodeColour}</span>{" "}
                because you asked for it by name
              </>
            )}
            .
          </p>

          {applied.runnerUp && (
            <p className="mt-2 text-[11px] text-fog">
              Second closest was {applied.runnerUp.label}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
