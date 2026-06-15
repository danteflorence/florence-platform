import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll to the top on route (pathname) change. Hash-only changes
 * (the in-page table-of-contents anchors) are intentionally left alone so
 * smooth anchor scrolling still works.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
