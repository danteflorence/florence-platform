import { useState } from "react";

type Op = "+" | "−" | "×" | "÷";

function apply(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

/** A basic immediate-execution calculator for dosage math. */
export default function Calculator({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [waiting, setWaiting] = useState(false);

  if (!open) return null;

  const inputDigit = (d: string) => {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay((s) => (s === "0" ? d : s + d));
    }
  };
  const inputDot = () => {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
    } else if (!display.includes(".")) {
      setDisplay((s) => s + ".");
    }
  };
  const chooseOp = (next: Op) => {
    const cur = parseFloat(display);
    if (acc === null) setAcc(cur);
    else if (!waiting) {
      const r = apply(acc, cur, op!);
      setAcc(r);
      setDisplay(String(r));
    }
    setOp(next);
    setWaiting(true);
  };
  const equals = () => {
    if (op !== null && acc !== null) {
      const r = apply(acc, parseFloat(display), op);
      setDisplay(Number.isNaN(r) ? "Error" : String(r));
      setAcc(null);
      setOp(null);
      setWaiting(true);
    }
  };
  const clearAll = () => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setWaiting(false);
  };
  const backspace = () =>
    setDisplay((s) => (s.length > 1 ? s.slice(0, -1) : "0"));

  const Key = ({
    label,
    onClick,
    variant = "num",
    wide,
  }: {
    label: string;
    onClick: () => void;
    variant?: "num" | "op" | "eq" | "fn";
    wide?: boolean;
  }) => {
    const tone =
      variant === "op"
        ? "bg-florence-indigo-soft text-florence-indigo-dark"
        : variant === "eq"
          ? "bg-florence-teal text-white"
          : variant === "fn"
            ? "bg-florence-mist text-florence-slate"
            : "bg-white text-florence-ink";
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${wide ? "col-span-2" : ""} rounded-lg border border-florence-line py-2 text-sm font-semibold transition-colors hover:brightness-95 ${tone}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-60 rounded-2xl border border-florence-line bg-white p-3 shadow-card-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="fl-eyebrow">Calculator</span>
        <button
          onClick={onClose}
          aria-label="Close calculator"
          className="grid h-6 w-6 place-items-center rounded text-florence-slate hover:bg-florence-mist"
        >
          ✕
        </button>
      </div>
      <div className="mb-2 overflow-x-auto rounded-lg bg-florence-ink px-3 py-2 text-right font-mono text-xl text-white">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <Key label="C" variant="fn" onClick={clearAll} />
        <Key label="⌫" variant="fn" onClick={backspace} />
        <Key label="÷" variant="op" onClick={() => chooseOp("÷")} />
        <Key label="×" variant="op" onClick={() => chooseOp("×")} />
        {["7", "8", "9"].map((d) => (
          <Key key={d} label={d} onClick={() => inputDigit(d)} />
        ))}
        <Key label="−" variant="op" onClick={() => chooseOp("−")} />
        {["4", "5", "6"].map((d) => (
          <Key key={d} label={d} onClick={() => inputDigit(d)} />
        ))}
        <Key label="+" variant="op" onClick={() => chooseOp("+")} />
        {["1", "2", "3"].map((d) => (
          <Key key={d} label={d} onClick={() => inputDigit(d)} />
        ))}
        <Key label="=" variant="eq" onClick={equals} />
        <Key label="0" wide onClick={() => inputDigit("0")} />
        <Key label="." onClick={inputDot} />
      </div>
    </div>
  );
}
