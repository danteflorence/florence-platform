import { useEffect, useRef, useState } from "react";
// Registers the <model-viewer> custom element as a side effect. Imported here
// (rather than globally) so three.js ships in the lazy-loaded lesson chunk.
import "@google/model-viewer";
import { HEART_HOTSPOTS, HEART_MODEL, type HeartHotspot } from "../data/heart";

type ModelStatus = "loading" | "ok" | "error";

function accentClasses(accent: HeartHotspot["accent"], active: boolean) {
  if (accent === "teal")
    return active
      ? "bg-florence-teal text-white border-florence-teal"
      : "bg-white text-florence-teal-dark border-florence-teal";
  return active
    ? "bg-florence-indigo text-white border-florence-indigo"
    : "bg-white text-florence-indigo border-florence-indigo";
}

/** Schematic anatomical heart used as the always-available 2D fallback. */
function HeartSchematic({
  activeId,
  onPick,
}: {
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Schematic heart with clickable structures"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="myo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4ECEC" />
          <stop offset="100%" stopColor="#E6D7DD" />
        </linearGradient>
      </defs>

      {/* great vessels */}
      <path
        d="M48 26 C 48 12, 36 10, 35 20 C 34 27, 40 28, 42 30"
        fill="none"
        stroke="#C9B8D6"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M54 24 C 56 12, 66 12, 64 22"
        fill="none"
        stroke="#9FB8D6"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* myocardium silhouette */}
      <path
        d="M50 30
           C 40 20, 22 22, 22 42
           C 22 64, 40 78, 50 88
           C 60 78, 78 64, 78 42
           C 78 22, 60 20, 50 30 Z"
        fill="url(#myo)"
        stroke="#B9A4C4"
        strokeWidth="1.2"
      />
      {/* septum + chamber hints */}
      <path
        d="M50 32 L 50 84"
        stroke="#C9B8D6"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <path
        d="M30 46 Q 50 40 70 46"
        fill="none"
        stroke="#C9B8D6"
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      {HEART_HOTSPOTS.map((h, i) => {
        const active = activeId === h.id;
        const fill = h.accent === "teal" ? "#15ABA8" : "#2A2A8C";
        return (
          <g
            key={h.id}
            className="cursor-pointer"
            onClick={() => onPick(h.id)}
            role="button"
            aria-label={h.label}
          >
            {active && (
              <circle cx={h.svg.x} cy={h.svg.y} r="5.4" fill={fill} opacity="0.18" />
            )}
            <circle
              cx={h.svg.x}
              cy={h.svg.y}
              r={active ? 3.4 : 2.8}
              fill={fill}
              stroke="#fff"
              strokeWidth="1.1"
            />
            <text
              x={h.svg.x}
              y={h.svg.y + 0.9}
              textAnchor="middle"
              fontSize="3"
              fontWeight="700"
              fill="#fff"
              pointerEvents="none"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function HeartViewer() {
  const mvRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<ModelStatus>("loading");
  const [view, setView] = useState<"3d" | "diagram">("3d");
  const [activeId, setActiveId] = useState<string>(HEART_HOTSPOTS[0].id);

  const active = HEART_HOTSPOTS.find((h) => h.id === activeId)!;

  // Detect whether the GLB actually loads; if not, fall back to the diagram.
  useEffect(() => {
    const el = mvRef.current;
    if (!el) return;
    const onLoad = () => setStatus("ok");
    const onError = () => {
      setStatus("error");
      setView("diagram");
    };
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    // Safety net: if neither event fires quickly, assume no model and show diagram.
    const timer = window.setTimeout(() => {
      setStatus((s) => {
        if (s === "loading") {
          setView("diagram");
          return "error";
        }
        return s;
      });
    }, 2500);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };
  }, []);

  const has3d = status !== "error";

  return (
    <div className="fl-card my-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-florence-line px-5 py-3">
        <div>
          <p className="fl-eyebrow">Interactive anatomy</p>
          <h3 className="text-lg font-semibold">Explore the heart</h3>
        </div>
        <div className="inline-flex rounded-lg border border-florence-line p-0.5 text-sm">
          <button
            onClick={() => has3d && setView("3d")}
            disabled={!has3d}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "3d"
                ? "bg-florence-indigo text-white"
                : "text-florence-slate hover:text-florence-ink disabled:opacity-40"
            }`}
          >
            3D model
          </button>
          <button
            onClick={() => setView("diagram")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "diagram"
                ? "bg-florence-indigo text-white"
                : "text-florence-slate hover:text-florence-ink"
            }`}
          >
            Diagram
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.3fr_1fr]">
        {/* Stage */}
        <div className="relative min-h-[320px] bg-gradient-to-br from-florence-indigo-soft/40 to-florence-teal-soft/40 p-4">
          {/* 3D model-viewer (kept mounted so load/error can fire) */}
          <div className={view === "3d" ? "block h-full" : "hidden"}>
            <model-viewer
              ref={mvRef as never}
              src={HEART_MODEL.src}
              alt="Interactive 3D anatomical heart"
              camera-controls
              auto-rotate
              auto-rotate-delay={800}
              rotation-per-second="14deg"
              shadow-intensity="0.9"
              exposure="1.0"
              touch-action="pan-y"
              style={{ width: "100%", height: "320px", background: "transparent" }}
            >
              {HEART_HOTSPOTS.map((h) => (
                <button
                  key={h.id}
                  slot={`hotspot-${h.id}`}
                  data-position={h.position}
                  data-normal={h.normal}
                  onClick={() => setActiveId(h.id)}
                  aria-label={h.label}
                  className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-bold shadow-card transition-transform hover:scale-110 ${accentClasses(
                    h.accent,
                    activeId === h.id,
                  )}`}
                >
                  {HEART_HOTSPOTS.indexOf(h) + 1}
                </button>
              ))}
            </model-viewer>
            {status === "loading" && (
              <p className="absolute inset-x-0 bottom-3 text-center text-xs text-florence-slate">
                Loading 3D model…
              </p>
            )}
          </div>

          {/* SVG fallback / diagram */}
          {view === "diagram" && (
            <div className="h-[320px]">
              <HeartSchematic activeId={activeId} onPick={setActiveId} />
            </div>
          )}

          {status === "error" && view === "diagram" && (
            <p className="absolute bottom-2 left-4 right-4 text-center text-[11px] text-florence-slate/80">
              Showing the labelled schematic. Drop a heart{" "}
              <code>.glb</code> into <code>public/models/</code> to enable the 3D
              model.
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div className="border-t border-florence-line p-5 md:border-l md:border-t-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {HEART_HOTSPOTS.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeId === h.id
                    ? accentClasses(h.accent, true)
                    : "border-florence-line bg-white text-florence-slate hover:bg-florence-mist"
                }`}
              >
                {HEART_HOTSPOTS.indexOf(h) + 1}
              </button>
            ))}
          </div>
          <h4 className="font-serif text-lg text-florence-ink">{active.label}</h4>
          <p className="mt-2 text-sm leading-relaxed text-florence-ink/90">
            {active.teaching}
          </p>
          <a
            href={`#${active.segment}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-florence-teal-dark hover:underline"
          >
            Jump to the lesson →
          </a>

          {HEART_MODEL.attribution.author && (
            <p className="mt-5 border-t border-florence-line pt-3 text-[11px] text-florence-slate/80">
              3D model: “{HEART_MODEL.attribution.title}” by{" "}
              {HEART_MODEL.attribution.author} ·{" "}
              {HEART_MODEL.attribution.license}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
