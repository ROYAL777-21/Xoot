import type { SVGProps } from "react";

/** The heart and plus from the supplied handoff's CarePlusMark (32 × 32). */
export function CarePlusSymbol({ width = 20, height = width, ...props }: SVGProps<SVGSVGElement>) {
  return <svg width={width} height={height} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <g transform="translate(-1 7) scale(0.7) rotate(-6 13.6 17)"><path d="M13.6,27.2 C8.4,23 3,18.6 3,13.4 C3,9.6 5.8,7 9.2,7 C11.4,7 13,8.4 13.8,10.4 C14.6,8.5 16.3,7.2 18.5,7.2 C21.8,7.2 24.3,9.8 24.2,13.4 C24.1,18.4 19,22.9 13.6,27.2 Z" /></g>
    <path d="M24.25,1.5 V14" /><path d="M18,7.75 H30.5" />
  </svg>;
}
