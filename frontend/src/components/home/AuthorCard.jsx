import { motion } from "framer-motion";
import { AUTHOR, hasAuthor } from "../../data/author";

// Who made this, at the end of the argument rather than the start of it.
//
// It sits after the numbers and before the last call to action, which is the
// point in the page where somebody has just been told what the site does, why
// it exists and how much of it there is. "And one person built it" lands there
// in a way it would not at the top.
//
// Built out of the same parts as everything else -- panel, hud frame, aurora,
// the label type, the gradient on the name -- so it reads as part of the site
// rather than a CV stapled to the end of it.

const LINKS = [
  { key: "linkedin", label: "LinkedIn", note: "Connect" },
  { key: "github", label: "GitHub", note: "The code" },
  { key: "portfolio", label: "Portfolio", note: "More work" },
  { key: "email", label: "Email", note: "Say hello" }
];

/** Initials for the monogram, so it works for one name or three. */
function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function AuthorCard() {
  // Nothing to show until there is a name. Better an absent section than one
  // introducing somebody as an empty string.
  if (!hasAuthor()) return null;

  const shown = LINKS.map((link) => ({ ...link, href: AUTHOR.links[link.key]?.trim() }))
    .filter((link) => link.href)
    .map((link) => ({
      ...link,
      href: link.key === "email" ? `mailto:${link.href}` : link.href
    }));

  return (
    <section id="built-by" className="relative overflow-hidden border-t border-white/8">
      <div className="aurora opacity-30" />

      <div className="relative mx-auto max-w-[1500px] px-5 py-20 md:px-8 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="label">Built by</p>

          <div className="panel hud-frame mt-5 p-6 md:p-9">
            <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">

              {/* WHO */}
              <div>
                <div className="flex items-center gap-4">
                  {/* A face if there is one, initials if there is not -- the
                      same monogram the nav uses when you are signed in. */}
                  {AUTHOR.photo ? (
                    <img
                      src={AUTHOR.photo}
                      alt={AUTHOR.name}
                      loading="lazy"
                      width={72}
                      height={72}
                      className="h-16 w-16 shrink-0 rounded-full border border-line object-cover md:h-[72px] md:w-[72px]"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-lg font-semibold tracking-tight text-chalk md:h-16 md:w-16 md:text-xl">
                      {initials(AUTHOR.name)}
                    </span>
                  )}

                  <div className="min-w-0">
                    <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
                      <span className="text-gradient">{AUTHOR.name}</span>
                    </h2>
                    <p className="mt-1 text-sm text-fog">{AUTHOR.role}</p>
                  </div>
                </div>

                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-chalk/85">
                  {AUTHOR.blurb}
                </p>

                {shown.length > 0 && (
                  <div className="mt-7 flex flex-wrap gap-2.5">
                    {shown.map((link, index) => (
                      <motion.a
                        key={link.key}
                        href={link.href}
                        target={link.key === "email" ? undefined : "_blank"}
                        rel={link.key === "email" ? undefined : "noreferrer noopener"}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.1 + index * 0.06 }}
                        className={[
                          "group flex items-center gap-2",
                          index === 0 ? "btn btn-signal" : "btn btn-ghost"
                        ].join(" ")}
                      >
                        {link.label}
                        <span className="transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </motion.a>
                    ))}
                  </div>
                )}
              </div>

              {/* WHAT, on the same card rather than a section of its own,
                  because the two only mean anything together. */}
              <div className="lg:border-l lg:border-line-soft lg:pl-14">
                <p className="label">On this project</p>

                <ul className="mt-5 space-y-4">
                  {AUTHOR.did.map((line, index) => (
                    <motion.li
                      key={line}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: 0.12 + index * 0.07 }}
                      className="flex gap-3 text-sm leading-relaxed text-fog"
                    >
                      <span className="readout mt-0.5 shrink-0 text-[10px] text-signal">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{line}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Not this project. Two lines each: a signpost to the portfolio,
                not a second copy of the CV. */}
            {AUTHOR.elsewhere?.length > 0 && (
              <>
                <div className="tick-rule-dense mt-8 opacity-60" />

                <div className="mt-6">
                  <p className="label">Elsewhere</p>

                  <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
                    {AUTHOR.elsewhere.map((place, index) => (
                      <motion.div
                        key={place.org}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-medium tracking-tight text-chalk">
                            {place.org}
                          </p>
                          <span className="label shrink-0">{place.when}</span>
                        </div>

                        <p className="mt-0.5 text-xs text-signal">{place.role}</p>

                        <p className="mt-2 text-sm leading-relaxed text-fog">
                          {place.note}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
