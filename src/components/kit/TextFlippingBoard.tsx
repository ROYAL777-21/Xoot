// Generated from the uploaded handoff by scripts/build/extract-flipping-board.mjs.
import React from "react";

const prefersReduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
};

const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:'\"%,./?°";

const ROWS = 6;

const COLS = 22;

const BASE_COL_DELAY = 30;

const BASE_ROW_DELAY = 20;

const BASE_STEP_MS = 55;

const BASE_FLIP_S = 0.35;

const BASE_TOTAL_S = ((COLS - 1) * BASE_COL_DELAY + (ROWS - 1) * BASE_ROW_DELAY + 8 * BASE_STEP_MS) / 1000;

const ACCENTS = [{
  bg: 'var(--xoot-violet-500)',
  fg: '#fff'
}, {
  bg: 'var(--xoot-careplus-500)',
  fg: '#fff'
}, {
  bg: 'var(--xoot-honey-500)',
  fg: 'var(--xoot-ink-900)'
}, {
  bg: 'var(--xoot-sage-500)',
  fg: '#fff'
}, {
  bg: 'var(--xoot-mist-500)',
  fg: '#fff'
}, {
  bg: 'var(--xoot-neutral-0)',
  fg: 'var(--xoot-ink-900)'
}];

function FlapCell({
  target,
  delay,
  stepMs,
  flipDuration
}) {
  const [current, setCurrent] = React.useState(' ');
  const [prev, setPrev] = React.useState(' ');
  const [flipId, setFlipId] = React.useState(0);
  const [accent, setAccent] = React.useState(null);
  const [prevAccent, setPrevAccent] = React.useState(null);
  const curRef = React.useRef(' ');
  const tgtRef = React.useRef(null);
  const accentRef = React.useRef(null);
  const startTimer = React.useRef(null);
  const stepTimer = React.useRef(null);
  React.useEffect(() => {
    if (startTimer.current) window.clearTimeout(startTimer.current);
    if (stepTimer.current) window.clearTimeout(stepTimer.current);
    const normalized = FLAP_CHARS.includes(String(target).toUpperCase()) ? String(target).toUpperCase() : ' ';
    if (normalized === tgtRef.current) return;
    tgtRef.current = normalized;

    /* Land immediately for reduced motion — the content matters, the mechanism does not. */
    if (prefersReduced()) {
      curRef.current = normalized;
      setCurrent(normalized);
      return;
    }
    if (normalized === ' ' && curRef.current === ' ') return;

    /* Randomised per cell so the board settles raggedly. A uniform count reads as a progress
       bar sweeping across, which is precisely the thing a split-flap board is not. */
    const scrambleCount = normalized === ' ' ? 8 + Math.floor(Math.random() * 8) : 25 + Math.floor(Math.random() * 15);
    const runStep = i => {
      const isLast = i === scrambleCount;
      const ch = isLast ? normalized : FLAP_CHARS[1 + Math.floor(Math.random() * (FLAP_CHARS.length - 1))];
      const newAccent = isLast ? null : Math.random() < 0.18 ? ACCENTS[Math.floor(Math.random() * ACCENTS.length)] : null;
      setPrev(curRef.current);
      setPrevAccent(accentRef.current);
      curRef.current = ch;
      accentRef.current = newAccent;
      setCurrent(ch);
      setAccent(newAccent);
      setFlipId(n => n + 1);
      if (!isLast) stepTimer.current = window.setTimeout(() => runStep(i + 1), stepMs);
    };
    startTimer.current = window.setTimeout(() => runStep(1), delay);
    return () => {
      if (startTimer.current) window.clearTimeout(startTimer.current);
      if (stepTimer.current) window.clearTimeout(stepTimer.current);
      tgtRef.current = null;
    };
  }, [target, delay, stepMs]);
  const show = current === ' ' ? '\u00A0' : current;
  const showPrev = prev === ' ' ? '\u00A0' : prev;
  const faceBg = accent ? accent.bg : 'var(--xoot-ink-800)';
  const faceFg = accent ? accent.fg : 'var(--xoot-neutral-0)';
  const flapBg = prevAccent ? prevAccent.bg : 'var(--xoot-ink-700)';
  const flapFg = prevAccent ? prevAccent.fg : 'var(--xoot-neutral-0)';
  const text = {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--xoot-font-mono)',
    fontWeight: 500,
    fontSize: 'clamp(6px, 1.7vw, 20px)',
    lineHeight: 1,
    userSelect: 'none'
  };
  return React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      aspectRatio: '3 / 5',
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.55)'
    }
  }, React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      perspective: 260
    }
  }, React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 'calc(50% - 0.5px)',
      overflow: 'hidden',
      background: faceBg
    }
  }, React.createElement("span", {
    style: {
      ...text,
      top: 0,
      height: '200%',
      color: faceFg
    }
  }, show)), React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 'calc(50% - 0.5px)',
      overflow: 'hidden',
      background: faceBg
    }
  }, React.createElement("span", {
    style: {
      ...text,
      bottom: 0,
      height: '200%',
      color: faceFg
    }
  }, show)), flipId > 0 && React.createElement("div", {
    key: 't' + flipId,
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 'calc(50% - 0.5px)',
      overflow: 'hidden',
      background: flapBg,
      transformOrigin: 'bottom',
      backfaceVisibility: 'hidden',
      animation: `xoot-flap-fall ${flipDuration}s cubic-bezier(.55,.055,.675,.19) both`
    }
  }, React.createElement("span", {
    style: {
      ...text,
      top: 0,
      height: '200%',
      color: flapFg
    }
  }, showPrev)), flipId > 0 && React.createElement("div", {
    key: 'b' + flipId,
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 'calc(50% - 0.5px)',
      overflow: 'hidden',
      background: faceBg,
      transformOrigin: 'top',
      backfaceVisibility: 'hidden',
      animation: `xoot-flap-rise ${flipDuration * 0.85}s cubic-bezier(.33,1.55,.64,1) ${flipDuration * 0.5}s both`
    }
  }, React.createElement("span", {
    style: {
      ...text,
      bottom: 0,
      height: '200%',
      color: faceFg
    }
  }, show)), React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '50%',
      height: 1,
      transform: 'translateY(-.5px)',
      background: 'rgba(0,0,0,.55)',
      zIndex: 20
    }
  })));
}

function wrapParagraph(paragraph, maxCols) {
  const lines = [];
  const words = paragraph.split(/[ \t]+/).filter(Boolean);
  let line = '';
  for (const w of words) {
    if (w.length > maxCols) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(w.slice(0, maxCols));
      continue;
    }
    if (!line) line = w;else if (line.length + 1 + w.length <= maxCols) line += ' ' + w;else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function TextFlippingBoard({
  text = '',
  duration = BASE_TOTAL_S,
  style = {}
}: { text?: string; duration?: number; style?: React.CSSProperties }) {
  const scale = duration / BASE_TOTAL_S;
  const colDelay = BASE_COL_DELAY * scale;
  const rowDelay = BASE_ROW_DELAY * scale;
  const stepMs = BASE_STEP_MS * scale;
  const flipDur = Math.min(0.6, Math.max(0.15, BASE_FLIP_S * scale));
  const grid = React.useMemo(() => {
    const g = Array.from({
      length: ROWS
    }, () => Array.from({
      length: COLS
    }, () => ' '));
    const lines = String(text).split('\n').flatMap(p => p.trim() === '' ? [''] : wrapParagraph(p, COLS)).slice(0, ROWS);
    const startRow = Math.max(0, Math.floor((ROWS - lines.length) / 2));
    lines.forEach((line, i) => {
      const r = startRow + i;
      if (r >= ROWS) return;
      const startCol = Math.max(0, Math.floor((COLS - line.length) / 2));
      line.split('').forEach((ch, c) => {
        if (startCol + c < COLS) g[r][startCol + c] = ch;
      });
    });
    return g;
  }, [text]);
  return React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: 760,
      margin: '0 auto',
      padding: 'clamp(8px, 1.6vw, 16px)',
      borderRadius: 'var(--xoot-radius-lg)',
      background: 'var(--xoot-ink-900)',
      boxShadow: '0 24px 70px -24px rgba(20,18,16,.6), inset 0 1px 0 rgba(255,255,255,.06)',
      ...style
    }
  }, React.createElement("style", null, `
        @keyframes xoot-flap-fall { from { transform: rotateX(0deg) } to { transform: rotateX(-100deg) } }
        @keyframes xoot-flap-rise { from { transform: rotateX(90deg) } to { transform: rotateX(0deg) } }
        @media (prefers-reduced-motion: reduce) {
          [style*="xoot-flap-fall"], [style*="xoot-flap-rise"] { animation: none !important }
        }
      `), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
      gap: 2
    }
  }, grid.map((row, r) => row.map((ch, c) => React.createElement(FlapCell, {
    key: `${r}-${c}`,
    target: ch,
    delay: c * colDelay + r * rowDelay,
    stepMs: stepMs,
    flipDuration: flipDur
  })))));
}
