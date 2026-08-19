// Before and after is the whole question this project exists to answer, so it
// gets a control of its own rather than living in a menu. Holding it shows the
// car as it left the factory; letting go puts the build back.
export default function CompareToggle({ comparing, setComparing, changes }) {
  const hold = () => setComparing(true);
  const release = () => setComparing(false);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onMouseDown={hold}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchStart={hold}
        onTouchEnd={release}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") hold();
        }}
        onKeyUp={release}
        disabled={changes === 0}
        className={[
          "btn flex-1 transition-colors",
          comparing ? "btn-signal" : "btn-ghost",
          changes === 0 ? "cursor-not-allowed opacity-40" : ""
        ].join(" ")}
      >
        {comparing ? "Showing stock" : "Hold to compare"}
      </button>

      <span className="readout shrink-0 text-[11px] text-fog">
        {changes} {changes === 1 ? "change" : "changes"}
      </span>
    </div>
  );
}
