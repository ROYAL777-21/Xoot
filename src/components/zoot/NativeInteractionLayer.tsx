import { useEffect } from "react";

const editableSelector = 'input, textarea, select, [contenteditable="true"]';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest(editableSelector));

const blurActiveField = () => {
  if (!(document.activeElement instanceof HTMLElement)) return;
  if (!isEditable(document.activeElement)) return;
  document.activeElement.blur();
};

export const NativeInteractionLayer = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;

    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const keyboardOffset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));

      document.documentElement.style.setProperty("--visual-viewport-height", `${height}px`);
      document.documentElement.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
      document.body.dataset.keyboardOpen = keyboardOffset > 80 ? "true" : "false";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isEditable(event.target)) {
        blurActiveField();
      }
    };

    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("scroll", blurActiveField, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });

    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("scroll", blurActiveField);
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.body.dataset.keyboardOpen = "false";
    };
  }, []);

  return null;
};
