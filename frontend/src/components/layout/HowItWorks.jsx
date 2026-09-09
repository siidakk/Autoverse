import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

// Where the method goes.
//
// Each of these pages was built on something worth explaining -- a model, a
// dataset, its accuracy, what it cannot do -- and every page led with it. That
// is the right information in the wrong order: somebody who wants to know what
// their car is worth should not have to read the phrase "gradient boosted
// trees" to find the form.
//
// So it is kept, in full, one click away. Shut, it is a quiet line of small
// type. Open, it is the same prose that used to sit under the title.
export default function HowItWorks({ label = "How this works", bodyClassName = "max-w-2xl space-y-2 pt-3 text-xs leading-relaxed text-fog", children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="label flex items-center gap-1.5 transition-colors hover:text-signal"
      >
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="block text-[8px] leading-none"
        >
          ▼
        </motion.span>
      </button>

      {/* Height animated rather than snapped, to match the way the rest of the
          site moves. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className={bodyClassName}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
