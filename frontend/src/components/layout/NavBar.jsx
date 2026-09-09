import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../lib/authContext";
import { SECTIONS } from "../../data/navigation";

// Where an account gets you. Kept beside the sign out that sits under them, so
// the two menus cannot drift apart.
const ACCOUNT_LINKS = [
  { to: "/garage", label: "My garage", short: "Garage" },
  { to: "/account", label: "Account details", short: "Account" }
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const accountRef = useRef(null);

  // The bar starts transparent over the hero and gains a background once the
  // page moves, so the landing image is not cut off by a strip of chrome.
  // Read once at mount rather than set from inside the effect, which matters
  // when someone arrives partway down a page from a link with a hash.
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 12
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A drawer left open across a navigation is a drawer covering the page you
  // just asked for. Closed on the next frame rather than during the effect, so
  // the route change and the close are not the same render.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOpen(false);
      setAccount(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!account) return undefined;

    const away = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccount(false);
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [account]);

  // Signing out drops the token, so the pages that need one show their signed
  // out state again by themselves. Home is where it lands: the garage would
  // only greet somebody who just left with an invitation to sign back in.
  const leave = () => {
    signOut();
    setAccount(false);
    setOpen(false);
    navigate("/");
  };

  // Nothing behind the drawer should scroll while it is over the top.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={[
          "sticky top-0 z-50 transition-colors duration-300",
          scrolled || open
            ? "border-b border-white/8 bg-ink/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        ].join(" ")}
      >
        <div className="mx-auto flex h-[70px] max-w-[1500px] items-center justify-between px-5 md:px-8">

          {/* WORDMARK */}
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative block h-5 w-[3px] overflow-hidden rounded-full bg-signal">
              <span className="absolute inset-0 bg-gradient-to-b from-signal to-flare" />
            </span>
            <span className="text-[19px] font-semibold tracking-tight">
              AUTO<span className="text-gradient">VERSE</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-8 lg:flex">
            {SECTIONS.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                title={section.blurb}
                className={({ isActive }) =>
                  [
                    "py-1 text-[15px] transition-colors",
                    isActive ? "text-chalk" : "text-fog hover:text-chalk"
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <span data-active={isActive} className="underline-grow">
                    {section.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {/* Signed in, this used to be a bare link to the garage, which
                meant /account was unreachable and the sign out button living
                on it could not be got to at all. */}
            {user ? (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccount((was) => !was)}
                  aria-expanded={account}
                  className="flex items-center gap-2 text-[14px] text-fog transition-colors hover:text-chalk"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-panel text-[11px] text-chalk">
                    {(user.name || user.email || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </button>

                <AnimatePresence>
                  {account && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="panel absolute right-0 z-50 mt-3 w-56 p-2"
                    >
                      <p className="px-3 pt-2 pb-1 text-xs text-fog">
                        Signed in as
                      </p>
                      <p className="truncate px-3 pb-2 text-sm text-chalk">
                        {user.email}
                      </p>

                      <div className="tick-rule-dense mx-3 opacity-60" />

                      {ACCOUNT_LINKS.map((entry) => (
                        <Link
                          key={entry.to}
                          to={entry.to}
                          className="block rounded-lg px-3 py-2 text-sm text-fog transition-colors hover:bg-raised hover:text-chalk"
                        >
                          {entry.label}
                        </Link>
                      ))}

                      <button
                        type="button"
                        onClick={leave}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-fog transition-colors hover:bg-raised hover:text-signal"
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/account"
                className="text-[14px] text-fog transition-colors hover:text-chalk"
              >
                Sign in
              </Link>
            )}

            <Link to="/customise" className="btn btn-signal">
              Start building
            </Link>
          </div>

          {/* MOBILE TOGGLE */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-[6px] lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <motion.span
              animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22 }}
              className="block h-[1.5px] w-6 rounded-full bg-chalk"
            />
            <motion.span
              animate={open ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="block h-[1.5px] w-6 rounded-full bg-chalk"
            />
            <motion.span
              animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.22 }}
              className="block h-[1.5px] w-6 rounded-full bg-signal"
            />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER
          Full height, and every entry carries its explanation, because a small
          screen is exactly where a one word label is least likely to be
          understood. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink/97 backdrop-blur-xl lg:hidden"
          >
            <div className="aurora opacity-25" />

            <nav className="relative flex h-full flex-col overflow-y-auto px-6 pt-20 pb-6">
              {SECTIONS.map((section, index) => (
                <motion.div
                  key={section.to}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.055, duration: 0.3 }}
                >
                  <NavLink
                    to={section.to}
                    className={({ isActive }) =>
                      [
                        "block border-b border-white/8 py-4",
                        isActive ? "text-signal" : "text-chalk"
                      ].join(" ")
                    }
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-[22px] font-semibold tracking-tight">
                        {section.label}
                      </span>
                      <span className="label shrink-0">{`0${index + 1}`}</span>
                    </span>
                    <span className="mt-1 block text-sm text-fog">{section.blurb}</span>
                  </NavLink>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.3 }}
                className="mt-auto flex flex-col gap-2.5 pt-6"
              >
                <Link to="/customise" className="btn btn-signal w-full">
                  Start building
                </Link>

                {user ? (
                  <>
                    <p className="truncate text-center text-xs text-fog">
                      Signed in as {user.email}
                    </p>
                    <div className="flex gap-3">
                      {ACCOUNT_LINKS.map((entry) => (
                        <Link key={entry.to} to={entry.to} className="btn btn-ghost flex-1">
                          {entry.short}
                        </Link>
                      ))}
                    </div>
                    <button type="button" onClick={leave} className="btn btn-ghost w-full">
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link to="/account" className="btn btn-ghost w-full">
                    Sign in
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
