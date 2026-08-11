import { type ReactNode } from "react";

/**
 * Bottom-docked call to action, with a fade that protects it from the content scrolling beneath.
 *
 * Ported from `design/Xoot_App.html`, `ui_kits/xoot_app/Frame.jsx`. It is the kit's answer to the
 * commit button on every flow — booking, gifting, Care+ — so porting it once is what stops each
 * of those screens inventing its own sticky footer.
 *
 * Two details that are easy to lose and expensive to notice:
 *
 * 1. **`pointerEvents` is off on the fade and back on for the content.** Without that the
 *    invisible gradient swallows taps on whatever is behind it — a bug that only shows up on a
 *    real device, because a mouse pointer lands on the button anyway.
 * 2. **The gradient ends in `--xoot-surface-page`, not white.** The kit's page is warm neutral
 *    `#F5F3F2`; fading to white leaves a visible band above the button on exactly the surface it
 *    is meant to protect.
 *
 * The kit positions this `absolute` inside its 390×844 phone frame. Here it is `sticky` by
 * default, because the web app scrolls a real document rather than a fixed-height shell —
 * `absolute` would park it at the bottom of the content instead of the bottom of the viewport.
 * Pass `position="absolute"` inside a fixed-height container to get the kit's exact behaviour.
 */

export type DockedCTAProps = {
  children: ReactNode;
  /** Small centred line above the action — the kit uses it for "No card needed" style notes. */
  note?: ReactNode;
  position?: "sticky" | "absolute";
};

export function DockedCTA({ children, note, position = "sticky" }: DockedCTAProps) {
  return (
    <div
      style={{
        position,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        padding: "30px 20px 20px",
        pointerEvents: "none",
        background:
          "linear-gradient(180deg, rgba(250,249,248,0) 0%, var(--xoot-surface-page) 44%)",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {note ? (
          <span
            style={{
              textAlign: "center",
              fontSize: "var(--xoot-caption)",
              color: "var(--xoot-text-muted)",
            }}
          >
            {note}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}
