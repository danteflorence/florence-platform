import { Link, Outlet, useLocation } from "react-router-dom";
import AccountNav from "./components/AccountNav";
import VoiceTutor from "./components/VoiceTutor";

/**
 * App shell - Florence Academy brand chrome shared across all routes.
 * The actual lesson content renders into <Outlet />.
 */
// Thumb-first navigation for the phones our learners actually study on.
// Hidden during sims (they own the bottom of the screen) and on desktop.
const TABS: { to: string; label: string; match: (p: string) => boolean; icon: string }[] = [
  { to: "/academy", label: "Home", match: (p) => p === "/academy" || p === "/learn" || p === "/", icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  { to: "/academy/practice", label: "Practice", match: (p) => p.includes("practice"), icon: "M4 5h16v3H4zM4 10.5h16v3H4zM4 16h10v3H4z" },
  { to: "/academy/sims", label: "Sims", match: (p) => p.includes("/sims") || p.startsWith("/sim/"), icon: "M12 3a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V23h-2v-2.06A9 9 0 0 1 3 12z" },
  { to: "/academy/tutor", label: "Tutor", match: (p) => p.includes("tutor"), icon: "M4 4h16v11H8l-4 4zM7 8h10v1.6H7zm0 3h7v1.6H7z" },
  { to: "/academy/account", label: "Account", match: (p) => p.includes("account"), icon: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-8 16a8 8 0 0 1 16 0z" },
];

export default function App() {
  const { pathname } = useLocation();
  const onPractice = pathname.includes("practice");
  const onTutor = pathname.includes("tutor");
  const onLibrary = pathname.includes("library");
  const onHome = pathname === "/learn";
  // Immersive routes own the bottom edge - no tab bar over the sim's action sheet.
  const immersive = pathname.startsWith("/sim/");

  return (
    <div className="min-h-screen bg-florence-mist">
      {/* With HashRouter the URL hash IS the route, so a plain `href="#main"`
          would be parsed as a navigation. Move focus to <main> programmatically
          and stop the hash from changing. */}
      <a
        href="#main"
        className="fl-skip"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus();
          }
        }}
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-florence-line/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link to="/learn" className="group flex shrink-0 items-center gap-2">
            {/* The official Florence wordmark (florenceedu.com brand asset). */}
            <img
              src="/brand/logo-black-small.png"
              alt="Florence"
              className="h-6 w-auto sm:h-7"
              decoding="async"
            />
            <span className="flex flex-col leading-none">
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-florence-teal-dark">
                Academy
              </span>
              {/* Hide subline on mobile so the wordmark + Practice + Sign in
                  fit on one row at 375px. */}
              <span className="hidden whitespace-nowrap text-xs font-medium text-florence-slate sm:block">
                NCLEX-RN Bootcamp
              </span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 text-sm font-medium text-florence-slate">
            {/* Redundant with the logo (also links home) on phones - hide it
                there so the brand wordmark and Practice fit on one row. */}
            <Link
              to="/learn"
              className={`hidden whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:block sm:px-3 ${
                onHome ? "bg-florence-teal-soft text-florence-teal-dark" : ""
              }`}
            >
              Curriculum Navigator
            </Link>
            <Link
              to="/academy/library"
              className={`whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:px-3 ${
                onLibrary ? "bg-florence-teal-soft text-florence-teal-dark" : ""
              }`}
            >
              Library
            </Link>
            <Link
              to="/academy/practice"
              className={`whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:px-3 ${
                onPractice ? "bg-florence-teal-soft text-florence-teal-dark" : ""
              }`}
            >
              Practice
            </Link>
            <Link
              to="/academy/tutor"
              className={`whitespace-nowrap rounded-lg px-2 py-1.5 transition-colors hover:bg-florence-mist hover:text-florence-ink sm:px-3 ${
                onTutor ? "bg-florence-teal-soft text-florence-teal-dark" : ""
              }`}
            >
              Tutor
            </Link>
            <AccountNav />
          </nav>
        </div>
      </header>

      <main id="main" className={immersive ? "" : "pb-16 sm:pb-0"}>
        <Outlet />
      </main>

      {/* Global voice tutor - invisible unless the instance has a tutor configured. */}
      <VoiceTutor />

      {/* Mobile bottom tab bar - one thumb, five destinations. */}
      {!immersive && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-florence-line bg-white/95 backdrop-blur sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {TABS.map((t) => {
              const active = t.match(pathname);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                    active ? "text-florence-teal-dark" : "text-florence-slate"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <footer className="mt-20 border-t border-florence-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-florence-slate sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            Florence Academy - interactive NCLEX-RN preparation for
            internationally educated nurses.
          </p>
          <p className="text-florence-slate/70">
            Educational use only. Not medical advice. Clinical content reflects
            current NCLEX teaching frameworks.
          </p>
        </div>
      </footer>
    </div>
  );
}
