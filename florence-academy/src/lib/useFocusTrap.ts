import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard-traps focus inside a container while `active` is true: moves focus in
 * when it opens, cycles Tab/Shift+Tab within, and restores focus to whatever was
 * focused before on close. For modal dialogs and overlays, so a keyboard or
 * screen-reader user can't wander into the inert background behind the modal.
 *
 * Attach the returned ref to the dialog container and give that node
 * `tabIndex={-1}` so it can receive focus when it holds no focusable children.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const visibleFocusables = () =>
      [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );

    // Move focus into the dialog (first control, else the container itself).
    (visibleFocusables()[0] ?? node).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = visibleFocusables();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement;
      if (e.shiftKey && (focused === first || !node.contains(focused))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (focused === last || !node.contains(focused))) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      // Return focus to the trigger so the user lands where they left off.
      restoreTo?.focus?.();
    };
  }, [active]);

  return ref;
}
