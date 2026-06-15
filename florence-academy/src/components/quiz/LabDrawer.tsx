import { LAB_GROUPS } from "../../data/labValues";

/** Slide-over reference of normal lab ranges — the candidate's "Lab Values" tool. */
export default function LabDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-florence-ink/20"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] transform overflow-y-auto border-l border-florence-line bg-white shadow-card-lg transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Lab values reference"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-florence-line bg-white px-4 py-3">
          <h3 className="text-base font-semibold">Lab values</h3>
          <button
            onClick={onClose}
            aria-label="Close lab values"
            className="grid h-7 w-7 place-items-center rounded-lg text-florence-slate hover:bg-florence-mist"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-4">
          {LAB_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="fl-eyebrow mb-1">{g.group}</p>
              <table className="w-full text-xs">
                <tbody>
                  {g.values.map((v) => (
                    <tr key={v.name} className="border-b border-florence-line/60">
                      <td className="py-1 pr-2 text-florence-ink">{v.name}</td>
                      <td className="whitespace-nowrap py-1 text-right font-mono text-florence-slate">
                        {v.display ??
                          `${v.low}–${v.high}${v.unit ? ` ${v.unit}` : ""}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="text-[11px] leading-relaxed text-florence-slate/70">
            Reference ranges vary by laboratory and assay. Teaching reference
            only — not a substitute for institutional values.
          </p>
        </div>
      </aside>
    </>
  );
}
