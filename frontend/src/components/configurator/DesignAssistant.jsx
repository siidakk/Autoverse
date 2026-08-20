import { useState } from "react";
import { THEMES, interpret } from "../../data/themes";

// Describe the car you want in words and the whole specification changes at
// once. The point of showing what it matched on is that a suggestion you can
// argue with is more useful than one that simply happens to you.
export default function DesignAssistant({ onApply }) {
  const [prompt, setPrompt] = useState("");
  const [applied, setApplied] = useState(null);
  const [missed, setMissed] = useState(false);

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
