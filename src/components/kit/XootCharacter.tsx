// Generated from the uploaded handoff by scripts/build/extract-character-artwork.mjs.
import React, { type CSSProperties, type HTMLAttributes } from 'react';

export interface XootCharacterProps extends HTMLAttributes<HTMLSpanElement> {
  scene?: 'xooter' | 'host' | 'customer' | 'pair';
  castIndex?: number;
  garment?: 'violet' | 'blush' | 'sage' | 'honey' | 'mist' | 'moss' | 'petal';
  size?: number;
  motion?: 'idle' | 'sway' | 'none';
  delay?: number;
  style?: CSSProperties;
}

const STROKE = '#1E1A17';

const SW = 3.2;

const XOOT_CAST = [{
  skin: '#E8B48C',
  shade: '#C9906A',
  hair: '#2B1F1A',
  hairLift: '#493730'
}, {
  skin: '#8D5A3B',
  shade: '#6E4229',
  hair: '#1A1210',
  hairLift: '#37271F'
}, {
  skin: '#C98A5E',
  shade: '#A66B42',
  hair: '#4A2C1E',
  hairLift: '#6B4430'
}, {
  skin: '#F2C9A6',
  shade: '#D6A57D',
  hair: '#7C4A2A',
  hairLift: '#9C6640'
}, {
  skin: '#6B4028',
  shade: '#4F2C1A',
  hair: '#221714',
  hairLift: '#3E2A24'
}];

const GARMENT = {
  violet: {
    fill: 'var(--xoot-violet-400)',
    shade: 'var(--xoot-violet-500)'
  },
  blush: {
    fill: 'var(--xoot-blush-mid)',
    shade: 'var(--xoot-blush-500)'
  },
  sage: {
    fill: 'var(--xoot-sage-mid)',
    shade: 'var(--xoot-sage-500)'
  },
  honey: {
    fill: 'var(--xoot-honey-mid)',
    shade: 'var(--xoot-honey-500)'
  },
  mist: {
    fill: 'var(--xoot-mist-mid)',
    shade: 'var(--xoot-mist-500)'
  },
  moss: {
    fill: 'var(--xoot-moss-mid)',
    shade: 'var(--xoot-moss-500)'
  },
  petal: {
    fill: 'var(--xoot-petal-mid)',
    shade: 'var(--xoot-petal-500)'
  }
};

function Face({
  x = 100,
  y = 62,
  cast,
  look = 'right',
  hairStyle = 'short',
  mood = 'calm'
}) {
  const flip = look === 'left' ? -1 : 1;
  const mouth = mood === 'warm' ? 'M3,10 q8,7 15,-1' : mood === 'focused' ? 'M5,11 q6,3 12,0' : 'M4,10 q7,5 13,-1';
  return React.createElement("g", {
    transform: `translate(${x} ${y}) scale(${flip} 1)`
  }, hairStyle === 'bun' && React.createElement(React.Fragment, null, React.createElement("circle", {
    cx: "-16",
    cy: "-30",
    r: "13",
    fill: cast.hair,
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement("path", {
    d: "M-24,-36 a13,13 0 0,1 9,-6",
    fill: "none",
    stroke: cast.hairLift,
    strokeWidth: "3",
    strokeLinecap: "round"
  })), hairStyle === 'afro' && React.createElement(React.Fragment, null, React.createElement("circle", {
    cx: "0",
    cy: "-8",
    r: "30",
    fill: cast.hair,
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement("path", {
    d: "M-22,-20 a28,28 0 0,1 16,-14",
    fill: "none",
    stroke: cast.hairLift,
    strokeWidth: "4.5",
    strokeLinecap: "round"
  })), React.createElement("path", {
    d: hairStyle === 'short' ? 'M-25,-6 A25,26 0 0,1 25,-6 L25,4 A8,8 0 0,0 17,-6 A20,14 0 0,0 -14,-8 L-25,4 Z' : hairStyle === 'bun' ? 'M-25,-4 A25,26 0 0,1 25,-4 L25,2 A10,10 0 0,0 12,-8 A22,16 0 0,0 -16,-10 L-25,4 Z' : 'M-27,0 A27,28 0 0,1 27,0 L27,6 A9,9 0 0,0 16,-6 A22,15 0 0,0 -16,-8 L-27,6 Z',
    fill: cast.hair,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), hairStyle !== 'afro' && React.createElement("path", {
    d: "M-18,-14 a24,24 0 0,1 13,-9",
    fill: "none",
    stroke: cast.hairLift,
    strokeWidth: "3.5",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: "M-19,-8 A19,21 0 0,1 19,-8 L19,10 A19,17 0 0,1 -19,10 Z",
    fill: cast.skin,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M-19,-4 A19,19 0 0,0 -6,13 A19,17 0 0,1 -19,10 Z",
    fill: cast.shade,
    opacity: ".55"
  }), React.createElement("path", {
    d: "M-19,0 a5,6 0 0,0 0,10",
    fill: cast.skin,
    stroke: STROKE,
    strokeWidth: SW - 0.6,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M19,0 l6,5 -6,3",
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), React.createElement("circle", {
    cx: "8",
    cy: "-1",
    r: "2.6",
    fill: STROKE
  }), React.createElement("path", {
    d: mouth,
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinecap: "round"
  }));
}

function Arm({
  d,
  cast,
  hand = undefined,
  handAngle = 0
}) {
  return React.createElement(React.Fragment, null, React.createElement("path", {
    d: d,
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW + 1.4,
    strokeLinecap: "round"
  }), hand && React.createElement("g", {
    transform: `translate(${hand[0]} ${hand[1]}) rotate(${handAngle})`
  }, React.createElement("path", {
    d: "M-6,-4 q0,-5 5,-5 q3,0 4,3 l0,1 q1,-3 4,-3 q3,0 3,4 l0,7 q0,7 -8,7 q-8,0 -8,-8 Z",
    fill: cast.skin,
    stroke: STROKE,
    strokeWidth: SW - 0.8,
    strokeLinejoin: "round"
  })));
}

function XooterAtWork({
  cast,
  garment
}) {
  const g = GARMENT[garment] || GARMENT.sage;
  return React.createElement("g", null, React.createElement("path", {
    d: "M52,200 L52,142 A48,42 0 0,1 148,142 L148,200 Z",
    fill: g.fill,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M124,200 L124,146 A48,42 0 0,0 108,116 A48,42 0 0,1 148,142 L148,200 Z",
    fill: g.shade,
    opacity: ".38"
  }), React.createElement("path", {
    d: "M78,200 L78,136 q22,-9 44,0 L122,200",
    fill: "rgba(255,255,255,.55)",
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement(Face, {
    cast: cast,
    hairStyle: "bun",
    y: 84,
    mood: "focused"
  }), React.createElement(Arm, {
    d: "M138,150 q22,-16 20,-42",
    cast: cast,
    hand: [159, 104],
    handAngle: -18
  }), React.createElement("rect", {
    x: "146",
    y: "86",
    width: "26",
    height: "18",
    rx: "6",
    fill: "var(--xoot-mist-wash)",
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement(Arm, {
    d: "M62,152 q-16,10 -14,28",
    cast: cast,
    hand: [48, 182],
    handAngle: 12
  }));
}

function HostWithKeys({
  cast,
  garment
}) {
  const g = GARMENT[garment] || GARMENT.honey;
  return React.createElement("g", null, React.createElement("path", {
    d: "M50,200 L50,146 A50,44 0 0,1 150,146 L150,200 Z",
    fill: g.fill,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M126,200 L126,150 A50,44 0 0,0 110,118 A50,44 0 0,1 150,146 L150,200 Z",
    fill: g.shade,
    opacity: ".38"
  }), React.createElement(Face, {
    cast: cast,
    hairStyle: "short",
    y: 88,
    look: "left",
    mood: "warm"
  }), React.createElement(Arm, {
    d: "M56,154 q-24,-8 -30,-30",
    cast: cast,
    hand: [25, 122],
    handAngle: -30
  }), React.createElement("circle", {
    cx: "20",
    cy: "140",
    r: "8",
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement("path", {
    d: "M20,148 l0,14 M20,155 l6,0 M20,160 l5,0",
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinecap: "round"
  }), React.createElement(Arm, {
    d: "M144,156 q16,12 14,30",
    cast: cast,
    hand: [158, 188],
    handAngle: 8
  }));
}

function CustomerAtEase({
  cast,
  garment
}) {
  const g = GARMENT[garment] || GARMENT.violet;
  return React.createElement("g", null, React.createElement("path", {
    d: "M54,200 L54,148 A46,42 0 0,1 146,148 L146,200 Z",
    fill: g.fill,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M124,200 L124,152 A46,42 0 0,0 108,120 A46,42 0 0,1 146,148 L146,200 Z",
    fill: g.shade,
    opacity: ".38"
  }), React.createElement(Face, {
    cast: cast,
    hairStyle: "afro",
    y: 86,
    mood: "warm"
  }), React.createElement(Arm, {
    d: "M62,150 q-26,-14 -8,-42 q14,-18 30,-8",
    cast: cast
  }), React.createElement(Arm, {
    d: "M138,150 q26,-14 8,-42 q-14,-18 -30,-8",
    cast: cast
  }), React.createElement("rect", {
    x: "118",
    y: "176",
    width: "26",
    height: "24",
    rx: "4",
    fill: "var(--xoot-neutral-0)",
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement("path", {
    d: "M144,182 q10,0 10,6 q0,6 -10,6",
    fill: "none",
    stroke: STROKE,
    strokeWidth: SW
  }), React.createElement("path", {
    d: "M124,170 q3,-6 0,-11 M132,170 q3,-7 0,-13 M139,170 q3,-6 0,-10",
    fill: "none",
    stroke: STROKE,
    strokeWidth: "2.2",
    strokeLinecap: "round",
    opacity: ".55"
  }));
}

function PairTalking({
  cast,
  garment
}) {
  const g = GARMENT[garment] || GARMENT.blush;
  const second = XOOT_CAST[(XOOT_CAST.indexOf(cast) + 2) % XOOT_CAST.length];
  return React.createElement("g", null, React.createElement("path", {
    d: "M96,200 L96,150 A44,40 0 0,1 184,150 L184,200 Z",
    fill: "var(--xoot-mist-mid)",
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M164,200 L164,154 A44,40 0 0,0 150,124 A44,40 0 0,1 184,150 L184,200 Z",
    fill: "var(--xoot-mist-500)",
    opacity: ".32"
  }), React.createElement(Face, {
    x: 140,
    y: 92,
    cast: second,
    hairStyle: "short",
    look: "left",
    mood: "warm"
  }), React.createElement("path", {
    d: "M16,200 L16,156 A44,40 0 0,1 104,156 L104,200 Z",
    fill: g.fill,
    stroke: STROKE,
    strokeWidth: SW,
    strokeLinejoin: "round"
  }), React.createElement("path", {
    d: "M84,200 L84,160 A44,40 0 0,0 70,130 A44,40 0 0,1 104,156 L104,200 Z",
    fill: g.shade,
    opacity: ".38"
  }), React.createElement(Face, {
    x: 60,
    y: 100,
    cast: cast,
    hairStyle: "bun",
    mood: "warm"
  }));
}

const SCENES = {
  xooter: XooterAtWork,
  host: HostWithKeys,
  customer: CustomerAtEase,
  pair: PairTalking
};

export function XootCharacter({
  scene = 'xooter',
  castIndex = 0,
  garment,
  size = 200,
  motion = 'idle',
  delay = 0,
  style = {},
  ...rest
}: XootCharacterProps) {
  const Scene = SCENES[scene] || XooterAtWork;
  const cast = XOOT_CAST[castIndex % XOOT_CAST.length];

  /* The loop is on the whole figure, never on limbs — independently animated arms read as a
     puppet, where a subtle full-body bob reads as alive. */
  const anim = motion === 'idle' ? `xoot-char-bob 5200ms var(--xoot-ease-in-out) ${delay}ms infinite` : motion === 'sway' ? `xoot-char-sway 6400ms var(--xoot-ease-in-out) ${delay}ms infinite` : 'none';
  return React.createElement("span", Object.assign({
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      lineHeight: 0,
      ...style
    }
  }, rest), React.createElement("style", null, `
        @keyframes xoot-char-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes xoot-char-sway { 0%,100% { transform: rotate(-1.4deg) } 50% { transform: rotate(1.4deg) } }
        @media (prefers-reduced-motion: reduce) { .xoot-char { animation: none !important } }
      `), React.createElement("svg", {
    viewBox: "0 0 200 200",
    width: "100%",
    height: "100%",
    "aria-hidden": "true",
    className: "xoot-char",
    style: {
      display: 'block',
      overflow: 'visible',
      animation: anim,
      transformOrigin: '50% 90%'
    }
  }, React.createElement(Scene, {
    cast: cast,
    garment: garment
  })));
}
