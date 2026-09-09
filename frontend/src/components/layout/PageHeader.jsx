import HowItWorks from "./HowItWorks";

// One shape for the top of every tool page: what this page is called, the
// question it answers, and one plain sentence about what you get back.
//
// It replaces five different headers that each opened with a full height title
// block and a paragraph of method -- "Content based filtering over every car on
// sale in India today", "Gradient boosted trees over 7,906 Indian listings" --
// so the tool itself began below the fold and the first thing a visitor read
// was how it was built rather than what it does for them.
//
// The method has not been thrown away. It moves into <HowItWorks>, shut by
// default, because it is the interesting part of this project and worth
// keeping -- just not ahead of the answer somebody came for.
//
// Laid out on one line where it fits, which is what keeps the tool near the
// top of the screen. The kicker uses the same word as the nav link that got
// you here: the page called itself "04 / Vision" while the menu called it
// "Identify", and a number implying a sequence that does not exist.
// `dense` is for the repair page, which has a standing requirement to fit one
// screen. It is the same header a size smaller, not a different one.
export default function PageHeader({ section, title, summary, children, dense = false }) {
  return (
    <>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="label shrink-0">{section}</p>

        <h1
          className={[
            "font-semibold tracking-tight",
            dense ? "text-2xl" : "text-2xl md:text-3xl"
          ].join(" ")}
        >
          {title}
        </h1>

        <p className="max-w-xl text-sm leading-snug text-fog">{summary}</p>

        {children && <HowItWorks>{children}</HowItWorks>}
      </header>

      <div className={dense ? "tick-rule mt-2 opacity-70" : "tick-rule mt-3 opacity-70"} />
    </>
  );
}
