import { Link, Outlet, useLocation } from "react-router-dom";
import AccountNav from "./components/AccountNav";
import VoiceTutor from "./components/VoiceTutor";

/**
 * App shell - Florence Academy brand chrome shared across all routes.
 * The actual lesson content renders into <Outlet />.
 */
export default function App() {
  const { pathname } = useLocation();
  const onPractice = pathname.includes("practice");
  const onTutor = pathname.includes("tutor");
  const onHome = pathname === "/learn";

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
          <Link to="/learn" className="group flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-florence-gradient text-sm font-bold text-white shadow-card">
              F
            </span>
            <span className="flex flex-col leading-none">
              <span className="whitespace-nowrap font-serif text-base font-semibold text-florence-ink sm:text-lg">
                <span className="sm:hidden">Florence</span>
                <span className="hidden sm:inline">Florence Academy</span>
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

      <main id="main">
        <Outlet />
      </main>

      {/* Global voice tutor - invisible unless the instance has a tutor configured. */}
      <VoiceTutor />

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
