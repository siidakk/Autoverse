import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", index: "00" },
  { to: "/configure", label: "Configurator", index: "01" },
  { to: "/recommend", label: "AI Match", index: "02" }
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    [
      "group flex items-baseline gap-2 px-1 py-2 text-sm transition-colors",
      isActive ? "text-signal" : "text-fog hover:text-chalk"
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">

        {/* WORDMARK */}
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="block h-4 w-[3px] bg-signal" />
          <span className="text-lg font-semibold tracking-tight">
            AUTO<span className="text-signal">VERSE</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === "/"}>
              <span className="label text-[9px] group-hover:text-signal">{link.index}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link to="/configure" className="btn btn-signal">
            Start Build
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-col gap-[5px] p-2 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span className="block h-[1px] w-6 bg-chalk" />
          <span className="block h-[1px] w-6 bg-chalk" />
          <span className="block h-[1px] w-4 bg-signal" />
        </button>
      </div>

      {/* MOBILE PANEL */}
      {open && (
        <div className="border-t border-line-soft bg-panel px-5 py-4 md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-baseline gap-3 border-b border-line-soft py-3 text-sm",
                  isActive ? "text-signal" : "text-fog"
                ].join(" ")
              }
            >
              <span className="label text-[9px]">{link.index}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
