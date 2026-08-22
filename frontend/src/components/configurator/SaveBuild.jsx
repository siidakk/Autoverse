import { useState } from "react";
import { saveBuild, describeError } from "../../lib/api";
import { useAuth } from "../../lib/authContext";

// Saving hands back a short code rather than needing an account, which is
// enough to reopen a build or pass it to somebody else.
export default function SaveBuild({ buildPayload, onSaved }) {
  const { user, authHeader } = useAuth();
  const [state, setState] = useState("idle");
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = code
    ? `${window.location.origin}/customise?build=${code}`
    : null;

  const save = async () => {
    setState("saving");
    setError(null);
    setCopied(false);

    try {
      const result = await saveBuild(buildPayload(), authHeader);
      setCode(result.code);
      setState("saved");
      onSaved?.(result.code);
    } catch (requestError) {
      setError(describeError(requestError));
      setState("idle");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={save}
        disabled={state === "saving"}
        className="btn btn-signal w-full disabled:opacity-60"
      >
        {state === "saving" ? "Saving…" : "Save this build"}
      </button>

      {code && user && (
        <p className="mt-2 text-[11px] text-fog">Saved to your garage.</p>
      )}

      {code && (
        <div className="mt-3 border border-line-soft bg-ink px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="label">Share code</span>
            <span className="readout text-base tracking-[0.25em] text-signal">
              {code}
            </span>
          </div>

          <button
            type="button"
            onClick={copy}
            className="label mt-3 w-full border border-line py-2 hover:border-signal hover:text-signal"
          >
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 border border-signal-deep bg-signal-deep/10 px-3 py-2 text-xs leading-relaxed text-fog">
          {error}
        </p>
      )}
    </div>
  );
}
