"use client";

import { useEffect, useRef } from "react";

/** Queue focus only for explicit list actions, never for typing or draft restoration. */
export function useDynamicListFocus<T extends HTMLElement>(count: number) {
  const inputs = useRef<(T | null)[]>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const pending = useRef<number | null>(null);
  useEffect(() => {
    if (pending.current === null) return;
    const target = pending.current;
    pending.current = null;
    (inputs.current[target] ?? addButton.current)?.focus();
  }); // Reordering keeps the count, but still needs the newly committed refs.
  return {
    registerInput: (index: number, element: T | null) => { inputs.current[index] = element; },
    registerAddButton: (element: HTMLButtonElement | null) => { addButton.current = element; },
    afterAdd: () => { pending.current = count; },
    afterRemove: (index: number) => { pending.current = Math.min(index, count - 2); },
    afterMove: (index: number) => { pending.current = index; },
  };
}
