import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import AcademyHome from "./pages/AcademyHome";
import LandingHome from "./pages/LandingHome";
import ScrollToTop from "./components/ScrollToTop";
import { CandidateProvider } from "./lib/CandidateContext";
import "@florence/design-system/tokens.css";
import "./index.css";

// Offline shell: register the service worker in production builds only (dev
// stays uncached so HMR behaves). Failure is silent - the app works without it.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

// The lesson route pulls in the heavy interactive libraries (model-viewer /
// three.js + recharts). Lazy-loading it keeps those out of the landing-page
// bundle so the home page paints fast.
const SectionLesson = lazy(() => import("./pages/SectionLesson"));
const Practice = lazy(() => import("./pages/Practice"));
const ClinicalTutor = lazy(() => import("./pages/ClinicalTutor"));
const Library = lazy(() => import("./pages/Library"));
const SectionDeck = lazy(() => import("./pages/SectionDeck"));
const SectionLive = lazy(() => import("./pages/SectionLive"));
const LiveLobby = lazy(() => import("./pages/LiveLobby"));
const ResidencyPage = lazy(() => import("./pages/ResidencyPage"));
const GrantCenter = lazy(() => import("./pages/GrantCenter"));
const MediaPreview = lazy(() => import("./pages/MediaPreview"));
const Account = lazy(() => import("./pages/Account"));
const Signup = lazy(() => import("./pages/Signup"));
const Activate = lazy(() => import("./pages/Activate"));
const ControlTower = lazy(() => import("./pages/ops/ControlTower"));
const Instructor = lazy(() => import("./pages/instructor/Instructor"));
const ScenarioStudio = lazy(() => import("./pages/instructor/ScenarioStudio"));
const CheckoutMock = lazy(() => import("./pages/CheckoutMock"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const EmployerPortal = lazy(() => import("./pages/partners/EmployerPortal"));
const UniversityDashboard = lazy(() => import("./pages/partners/UniversityDashboard"));
const DesignSystemPreviewPage = lazy(() => import("./pages/DesignSystemPreview"));
const VPatientSim = lazy(() => import("./pages/VPatientSim"));
const SimLibrary = lazy(() => import("./pages/SimLibrary"));

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <p className="animate-pulse text-sm font-medium text-florence-slate">
        Loading lesson…
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* HashRouter (not BrowserRouter): the bundle ships with a relative `base`
        (vite.config.ts) so it can deploy at the domain root OR a sub-path with
        no reconfiguration. Under history routing, a hard reload at a deep URL
        like /academy/practice resolves ./assets against /academy/ and fails to
        boot. Routing through the URL hash keeps every reload - and the on-demand
        bank fetches - resolving against the same index.html, at any deploy path,
        with no server-side SPA fallback required. */}
    <HashRouter>
      <ScrollToTop />
      <CandidateProvider>
      <Routes>
        {/* Full-screen presenter for ANY section - rendered OUTSIDE the brand
            chrome so the deck owns the whole viewport like a slide projector. */}
        <Route
          path="academy/:sectionSlug/present"
          element={
            <Suspense fallback={<PageFallback />}>
              <SectionDeck />
            </Suspense>
          }
        />
        {/* Live synced deck for any section - also full-screen. */}
        <Route
          path="academy/:sectionSlug/live"
          element={
            <Suspense fallback={<PageFallback />}>
              <SectionLive />
            </Suspense>
          }
        />
        {/* Internal Ops console - full-screen, NOT linked from the public app.
            Authenticates with an operator API client entered at runtime. */}
        <Route
          path="ops/control-tower"
          element={
            <Suspense fallback={<PageFallback />}>
              <ControlTower />
            </Suspense>
          }
        />
        {/* Instructor Console - full-screen, NOT linked from the public app.
            Own API client with a narrower scope set than ops. */}
        <Route
          path="instructor"
          element={
            <Suspense fallback={<PageFallback />}>
              <Instructor />
            </Suspense>
          }
        />
        {/* Scenario Studio - instructor authoring tool, full-screen, NOT linked
            from the public app. Reuses the instructor M2M session. */}
        <Route
          path="instructor/studio"
          element={
            <Suspense fallback={<PageFallback />}>
              <ScenarioStudio />
            </Suspense>
          }
        />
        {/* Partner portals - full-screen, NOT linked from the public app.
            Each authenticates with its own read-scoped API client at runtime. */}
        <Route
          path="employer"
          element={
            <Suspense fallback={<PageFallback />}>
              <EmployerPortal />
            </Suspense>
          }
        />
        <Route
          path="university"
          element={
            <Suspense fallback={<PageFallback />}>
              <UniversityDashboard />
            </Suspense>
          }
        />
        {/* Virtual-patient sim - full-screen, tap-only, mobile-first. Rendered
            OUTSIDE the App chrome so the monitor + action sheet own the
            viewport. Learners reach only approved scenarios; ?preview=1 (ops/
            authoring) also reveals drafts. */}
        <Route
          path="sim/:scenarioId"
          element={
            <Suspense fallback={<PageFallback />}>
              <VPatientSim />
            </Suspense>
          }
        />
        {/* Mock hosted-checkout (stands in for the provider's page in dev). */}
        <Route
          path="academy/checkout/mock"
          element={
            <Suspense fallback={<PageFallback />}>
              <CheckoutMock />
            </Suspense>
          }
        />
        {/* Public marketing landing - rendered OUTSIDE App so it doesn't ship
            the enrolled-student header chrome. Redirects authenticated
            students to /learn inside the component. */}
        <Route index element={<LandingHome />} />
        {/* Dedicated signup conversion route - public, outside App shell. */}
        <Route
          path="signup"
          element={
            <Suspense fallback={<PageFallback />}>
              <Signup />
            </Suspense>
          }
        />
        {/* Partner activation - QR + URL on the Lob outreach postcard land here.
            Public; the FLOR-XXXXX code is the only auth. */}
        <Route
          path="activate"
          element={
            <Suspense fallback={<PageFallback />}>
              <Activate />
            </Suspense>
          }
        />
        <Route element={<App />}>
          {/* Enrolled-student Curriculum Navigator - the old home, now at /learn. */}
          <Route path="learn" element={<AcademyHome />} />
          {/* Friendly alias for muscle memory + bookmarks. */}
          <Route path="academy" element={<Navigate to="/learn" replace />} />
          <Route
            path="academy/practice"
            element={
              <Suspense fallback={<PageFallback />}>
                <Practice />
              </Suspense>
            }
          />
          <Route
            path="academy/tutor"
            element={
              <Suspense fallback={<PageFallback />}>
                <ClinicalTutor />
              </Suspense>
            }
          />
          <Route
            path="academy/library"
            element={
              <Suspense fallback={<PageFallback />}>
                <Library />
              </Suspense>
            }
          />
          <Route
            path="academy/sims"
            element={
              <Suspense fallback={<PageFallback />}>
                <SimLibrary />
              </Suspense>
            }
          />
          <Route
            path="academy/live"
            element={
              <Suspense fallback={<PageFallback />}>
                <LiveLobby />
              </Suspense>
            }
          />
          <Route
            path="academy/residency"
            element={
              <Suspense fallback={<PageFallback />}>
                <ResidencyPage />
              </Suspense>
            }
          />
          <Route
            path="academy/grants"
            element={
              <Suspense fallback={<PageFallback />}>
                <GrantCenter />
              </Suspense>
            }
          />
          <Route
            path="academy/account"
            element={
              <Suspense fallback={<PageFallback />}>
                <Account />
              </Suspense>
            }
          />
          <Route
            path="academy/design-system"
            element={
              <Suspense fallback={<PageFallback />}>
                <DesignSystemPreviewPage />
              </Suspense>
            }
          />
          <Route
            path="academy/verify"
            element={
              <Suspense fallback={<PageFallback />}>
                <VerifyEmail />
              </Suspense>
            }
          />
          {/* Content-lab gallery for the image / media item-type scaffolds. */}
          <Route
            path="academy/media-preview"
            element={
              <Suspense fallback={<PageFallback />}>
                <MediaPreview />
              </Suspense>
            }
          />
          {/* Keep the old hour-based deep link working. */}
          <Route
            path="academy/hour-7-cardiac"
            element={<Navigate to="/academy/section-7-cardiac" replace />}
          />
          <Route path="academy/library/:sectionSlug" element={<Navigate to="/academy/library" replace />} />
          {/* Generic section reader - any section slug. Static routes above win
              by specificity; unknown slugs render a friendly "coming soon". */}
          <Route
            path="academy/:sectionSlug"
            element={
              <Suspense fallback={<PageFallback />}>
                <SectionLesson />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/learn" replace />} />
        </Route>
      </Routes>
      </CandidateProvider>
    </HashRouter>
  </React.StrictMode>,
);
