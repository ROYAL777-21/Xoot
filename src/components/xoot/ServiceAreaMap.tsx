import React from "react";
import { approvedLaunchRegions } from "@/lib/operations";
import "@/styles/homepage-sections.css";

// Coordinates and SVG composition from the uploaded SiteMap.jsx.
const SA: [number, number][] = [
  [16.45,-28.58],[17.4,-30.1],[17.9,-31.4],[18.2,-32.6],[18.35,-33.5],[18.45,-34.35],
  [19.3,-34.83],[20.9,-34.4],[22.6,-34.0],[24.8,-34.2],[25.7,-34.0],[26.9,-33.7],
  [28.0,-32.7],[29.2,-31.5],[30.2,-30.9],[31.1,-29.9],[31.6,-29.2],[32.4,-28.5],
  [32.9,-27.0],[32.89,-26.85],[32.0,-26.4],[31.9,-25.9],[31.3,-25.7],[31.0,-25.4],
  [31.5,-24.4],[31.9,-24.1],[31.3,-22.4],[30.3,-22.35],[29.4,-22.2],[28.2,-22.7],
  [27.5,-23.4],[26.9,-24.3],[26.0,-24.7],[25.6,-25.5],[24.7,-25.8],[23.9,-25.6],
  [23.0,-25.3],[22.6,-26.1],[21.7,-26.7],[20.9,-26.8],[20.6,-26.5],[20.0,-25.6],
  [19.98,-24.77],[19.98,-28.46],[19.0,-28.9],[18.0,-28.9],[17.0,-28.15],
];

/* Lesotho — an independent country entirely inside South Africa, so it is a hole in the fill.
   Painting over it would be geographically wrong and anyone from here would notice. */
const LESOTHO: [number, number][] = [
  [27.0,-29.6],[27.8,-30.1],[28.7,-30.6],[29.4,-30.3],[29.3,-29.6],[28.6,-28.6],
  [27.7,-28.6],[27.0,-29.0],
];

/* Original Gauteng outline; highlighted launch suburbs are defined below. */
const GAUTENG: [number, number][] = [
  [27.0,-25.6],[27.6,-25.3],[28.0,-25.15],[28.5,-25.35],[29.0,-25.7],[29.05,-26.3],
  [28.6,-26.9],[27.9,-27.05],[27.3,-26.85],[26.95,-26.3],
];

/* Reference suburb coordinates. Highlights come from the approved launch-region list. */
const PLACES: [string, number, number, boolean][] = [
  ['Pretoria', 28.188, -25.746, true],
  ['Centurion', 28.19, -25.86, false],
  ['Midrand', 28.13, -25.99, true],
  ['Fourways', 28.01, -26.02, true],
  ['Bryanston', 28.02, -26.06, true],
  ['Sandton', 28.056, -26.107, true],
  ['Randburg', 27.99, -26.09, false],
  ['Rosebank', 28.041, -26.146, true],
  ['Kempton Park', 28.23, -26.10, false],
  ['Roodepoort', 27.87, -26.16, false],
  ['Johannesburg', 28.047, -26.204, true],
  ['Benoni', 28.32, -26.19, false],
  ['Alberton', 28.12, -26.27, false],
  ['Soweto', 27.86, -26.27, true],
];

/* One projector for both maps. Equirectangular with a cosine correction at the mean latitude —
   at this extent that is visually indistinguishable from a proper conic and far simpler to reason
   about when placing a label. */
function makeProjector(pts: [number, number][], w: number, h: number, pad: number) {
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const lon0 = Math.min(...lons), lon1 = Math.max(...lons);
  const lat0 = Math.min(...lats), lat1 = Math.max(...lats);
  const k = Math.cos((lat0 + lat1) / 2 * Math.PI / 180);
  const dx = (lon1 - lon0) * k, dy = lat1 - lat0;
  const s = Math.min((w - pad * 2) / dx, (h - pad * 2) / dy);
  const ox = (w - dx * s) / 2, oy = (h - dy * s) / 2;
  return (lon, lat) => [ox + (lon - lon0) * k * s, oy + (lat1 - lat) * s];
}

const toPath = (ring: [number, number][], P: (lon: number, lat: number) => number[]) => ring.map((p, i) => (i ? 'L' : 'M') + P(p[0], p[1]).map(n => n.toFixed(1)).join(' ')).join(' ') + ' Z';

export function ServiceAreaMap() {
  const [hover, setHover] = React.useState<string | null>(null);

  const P = React.useMemo(() => makeProjector(SA, 400, 340, 14), []);
  const Z = React.useMemo(() => makeProjector(GAUTENG, 400, 340, 46), []);

  return (
    <section id="coverage" className="xoot-public-section xoot-public-section--alt"><div className="xoot-public-inner">
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
        gap: 'clamp(28px, 4vw, 48px)', alignItems: 'center',
      }}>
        <div>
          <div className="xoot-section-head" style={{maxWidth: 480}}><p className="xoot-section-eyebrow">Where we operate</p><h2 className="xoot-section-title">Starting in <span className="xoot-squiggle">Johannesburg.</span> Growing with care.</h2><p className="xoot-section-sub">Our launch suburbs are listed below. Enter your address when you book to check service coverage and available Xooters. A place on the map is a location, not a promise of live availability.</p></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -20 }}>
            {approvedLaunchRegions.map(a => (
              <span key={a}
                onMouseEnter={() => setHover(a)} onMouseLeave={() => setHover(null)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--xoot-radius-pill)',
                  background: hover?.toLowerCase() === a ? 'var(--xoot-violet-500)' : 'var(--xoot-surface-card)',
                  color: hover === a ? '#fff' : 'inherit',
                  boxShadow: hover === a ? 'none' : 'inset 0 0 0 1px var(--xoot-border-color)',
                  fontSize: 'var(--xoot-body-sm)', fontWeight: 600, textTransform: 'capitalize', cursor: 'default',
                  transition: 'all var(--xoot-dur-fast) var(--xoot-ease-out)',
                }}>{a}</span>
            ))}
            <span style={{
              padding: '8px 14px', borderRadius: 'var(--xoot-radius-pill)',
              background: 'var(--xoot-violet-50)', color: 'var(--xoot-violet-800)',
              fontSize: 'var(--xoot-body-sm)', fontWeight: 700,
            }}>Availability confirmed in booking</span>
          </div>
        </div>

        <div style={{
          position: 'relative', aspectRatio: '4 / 3.4', borderRadius: 'var(--xoot-radius-xl)',
          overflow: 'hidden', background: 'var(--xoot-surface-page)', boxShadow: 'var(--xoot-shadow-3)',
        }}>
          <svg viewBox="0 0 400 340" role="img"
            aria-label="Map of South Africa with Gauteng highlighted, and an inset showing reference locations and selected launch suburbs"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <clipPath id="xt-sa"><path d={toPath(SA, P)} /></clipPath>
            </defs>

            {/* The country. Lesotho is subtracted with evenodd rather than covered. */}
            <path d={toPath(SA, P) + ' ' + toPath(LESOTHO, P)} fillRule="evenodd"
              fill="var(--xoot-neutral-200)" stroke="var(--xoot-neutral-400)" strokeWidth="1.1"
              strokeLinejoin="round" />

            {/* Gauteng, the served province. */}
            <path d={toPath(GAUTENG, P)} clipPath="url(#xt-sa)"
              fill="var(--xoot-violet-500)" fillOpacity=".9"
              stroke="var(--xoot-violet-700)" strokeWidth="1.2" strokeLinejoin="round" />

            {/* A leader from the province to the inset, so the zoom is legible as a zoom. */}
            {(() => {
              const g = P(28.1, -26.1);
              return (
                <g>
                  <circle cx={g[0]} cy={g[1]} r="16" fill="none"
                    stroke="var(--xoot-violet-500)" strokeWidth="1.2" strokeDasharray="3 4" opacity=".8" />
                  <line x1={g[0] - 15} y1={g[1] + 9} x2="190" y2="176"
                    stroke="var(--xoot-violet-400)" strokeWidth="1.3" strokeDasharray="3 4" />
                </g>
              );
            })()}

            <text x={P(25.0, -28.2)[0]} y={P(25.0, -28.2)[1]} textAnchor="middle"
              style={{ fontSize: 11, fontWeight: 700, fill: 'var(--xoot-text-muted)', letterSpacing: '.08em' }}>
              SOUTH AFRICA
            </text>
            <text x={P(28.5, -29.5)[0]} y={P(28.5, -29.5)[1]} textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 600, fill: 'var(--xoot-text-muted)' }}>
              LESOTHO
            </text>

            {/* ── The inset: Gauteng at scale, with the real suburbs ── */}
            <g transform="translate(16, 178) scale(.42)">
              <rect x="-14" y="-14" width="428" height="368" rx="26"
                fill="var(--xoot-surface-card)" stroke="var(--xoot-violet-200)" strokeWidth="2.6" />
              <path d={toPath(GAUTENG, Z)} fill="var(--xoot-violet-50)"
                stroke="var(--xoot-violet-500)" strokeWidth="2.4" strokeLinejoin="round" />

              {PLACES.map(([name, lon, lat]) => {
                const priority = approvedLaunchRegions.includes(name.toLowerCase());
                const [x, y] = Z(lon, lat);
                const on = hover?.toLowerCase() === name.toLowerCase();
                return (
                  <g key={name}>
                    {priority && <circle cx={x} cy={y} r={on ? 26 : 19} fill="var(--xoot-violet-500)" opacity={on ? '.3' : '.15'} />}
                    <circle cx={x} cy={y} r={priority ? 9 : 6.5}
                      fill={priority ? 'var(--xoot-violet-600)' : 'var(--xoot-surface-card)'}
                      stroke={priority ? 'none' : 'var(--xoot-violet-500)'} strokeWidth="3" />
                  </g>
                );
              })}

              {/* Only the anchors are labelled — fourteen labels at this size is a smudge. */}
              {([['Pretoria', 28.188, -25.746, 'start', 16, 5],
                ['Sandton', 28.056, -26.107, 'end', -16, 0],
                ['Soweto', 27.86, -26.27, 'end', -14, 12],
                ['Benoni', 28.32, -26.19, 'start', 15, 4]] as const).map(([n, lon, lat, anchor, dx, dy]) => {
                const [x, y] = Z(lon, lat);
                return (
                  <text key={n} x={x + dx} y={y + dy} textAnchor={anchor}
                    style={{ fontSize: 21, fontWeight: 700, fill: 'var(--xoot-text-primary)' }}>{n}</text>
                );
              })}
              <text x="200" y="342" textAnchor="middle"
                style={{ fontSize: 20, fontWeight: 800, letterSpacing: '.14em', fill: 'var(--xoot-violet-700)' }}>
                GAUTENG
              </text>
            </g>
          </svg>

          <div style={{
            position: 'absolute', left: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 7,
            padding: '11px 15px', borderRadius: 'var(--xoot-radius-md)',
            background: 'var(--xoot-glass-light)', backdropFilter: 'blur(var(--xoot-glass-blur))',
            boxShadow: 'var(--xoot-shadow-glass)',
          }}>
            {([['var(--xoot-violet-600)', 'Launch suburb', true], ['transparent', 'Reference location', false]] as const).map(([bg, label, solid]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: bg,
                  boxShadow: solid ? 'none' : 'inset 0 0 0 2px var(--xoot-violet-500)',
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--xoot-text-secondary)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div></section>
  );
}
