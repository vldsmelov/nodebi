"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Route external-to-editor links through its existing decision UI. Do not patch router/history. */
export function useOutsideLinkGuard(root: RefObject<HTMLElement | null>, enabled: boolean, leave: (action: () => void) => void) {
  const guard = useRef(leave);
  useEffect(() => { guard.current = leave; });
  useEffect(() => {
    if (!enabled) return;
    let replaying = false;
    const click = (event: MouseEvent) => {
      if (replaying || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || root.current?.contains(anchor) || anchor.hasAttribute("download") || anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(url.protocol) || url.pathname === location.pathname && url.search === location.search && url.origin === location.origin) return;
      event.preventDefault(); event.stopImmediatePropagation();
      guard.current(() => {
        if (!anchor.isConnected) return;
        replaying = true;
        try { anchor.click(); } finally { replaying = false; }
      });
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [enabled, root]);
}
