import { useEffect, useMemo, useRef, useState } from "react";

// Pick one car out of a hundred and eighty six, by typing.
//
// A native <select> holds them all and is unusable for it: the list is a
// hundred and eighty six rows long, and its only search is first-letter
// matching, so finding a Fortuner means scrolling past every Tata.
//
// The repair page needed this because the photo's guess is often wrong -- it
// reads a shape and a size, never a badge -- and the honest design is one
// guess plus an easy way to correct it. Offering four alternative chips was
// neither: it named the wrong car and then offered three more wrong ones.

/** Matches loosely, so "fortun", "toyota for" and "TF" all find the Fortuner. */
function matches(name, query) {
  const haystack = name.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  // Every word has to appear somewhere, in any order: "toyota fort" works and
  // so does "fort toyota".
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export default function CarPicker({ models, value, onChange, label = "Car" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  const current = models.find((entry) => `${entry.brand}|${entry.model}` === value);

  const found = useMemo(
    () => models.filter((entry) => matches(entry.model, query)).slice(0, 60),
    [models, query]
  );

  // Clicking anywhere else closes it, which is what a dropdown is expected to
  // do and what a bare list of buttons does not.
  useEffect(() => {
    if (!open) return undefined;

    const away = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const choose = (entry) => {
    onChange(`${entry.brand}|${entry.model}`);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <span className="label">{label}</span>

      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="field mt-2 flex w-full items-center justify-between text-left"
      >
        <span className="truncate">{current?.model ?? "Choose a car"}</span>
        <span className="ml-2 shrink-0 text-fog">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full border border-line bg-panel shadow-xl">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" && found.length) choose(found[0]);
            }}
            placeholder={`Type to search ${models.length} cars…`}
            className="field rounded-none border-0 border-b border-line"
          />

          <div className="max-h-64 overflow-y-auto">
            {found.length === 0 && (
              <p className="px-3 py-4 text-xs text-fog">
                Nothing matches “{query}”.
              </p>
            )}

            {found.map((entry) => {
              const key = `${entry.brand}|${entry.model}`;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => choose(entry)}
                  className={[
                    "block w-full px-3 py-2 text-left text-sm transition-colors",
                    key === value ? "bg-signal text-ink" : "text-fog hover:bg-raised hover:text-chalk"
                  ].join(" ")}
                >
                  {entry.model}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
