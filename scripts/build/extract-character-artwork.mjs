import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

// Preserve the supplied illustration paths; no redraw or runtime design-bundle dependency.
const sourcePath = 'design/handoff-2026-09-03/xoot/ds-bundle.js';
const source = readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
const tree = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['STROKE', 'SW', 'XOOT_CAST', 'GARMENT', 'Face', 'Arm', 'XooterAtWork', 'HostWithKeys', 'CustomerAtEase', 'PairTalking', 'SCENES', 'XootCharacter']);
const selected = [];
function select(node) {
  const name = ts.isFunctionDeclaration(node) ? node.name?.text : ts.isVariableStatement(node) ? node.declarationList.declarations[0].name.getText(tree) : '';
  if (names.has(name) && !selected.some(item => item.name === name)) selected.push({ name, node });
  else ts.forEachChild(node, select);
}
select(tree);
if (selected.length !== names.size) throw new Error('Original character definitions changed; review the extraction.');
let body = selected.map(({node}) => node.getText(tree)).join('\n\n').replaceAll('/*#__PURE__*/', '').replaceAll('_extends(', 'Object.assign(');
body = body.replace('function XootCharacter({', 'export function XootCharacter({').replace('  ...rest\n}) {', '  ...rest\n}: XootCharacterProps) {');
body = body.replace('  hand,\n', '  hand = undefined,\n');
body = body.replace('const cast = XOOT_CAST[castIndex % XOOT_CAST.length];', 'const index = Number.isFinite(castIndex) ? Math.trunc(castIndex) : 0;\n  const cast = XOOT_CAST[((index % XOOT_CAST.length) + XOOT_CAST.length) % XOOT_CAST.length];');
// Repair the rendering envelope, never the uploaded character paths, cast or garment palette.
// All original strokes fit inside these bounds (including the base at y=200 + SW/2).
body = body.slice(0, body.indexOf('export function XootCharacter(')) + `export function XootCharacter({
  scene = 'xooter', castIndex = 0, garment, size = 200, motion = 'idle', delay = 0,
  style = {}, className = '', ...rest
}: XootCharacterProps) {
  const Scene = SCENES[scene] || XooterAtWork;
  const index = Number.isFinite(castIndex) ? Math.trunc(castIndex) : 0;
  const cast = XOOT_CAST[((index % XOOT_CAST.length) + XOOT_CAST.length) % XOOT_CAST.length];
  return <span {...rest} className={\`xoot-character \${className}\`} style={{ width: \`var(--xoot-character-size, \${size}px)\`, ...style }}>
    <span className="xoot-character-motion" data-motion={motion} style={{ animationDelay: \`\${delay}ms\` }}>
      <svg viewBox="8 32 184 176" width="184" height="176" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision" strokeLinecap="round" strokeLinejoin="round">
        <Scene cast={cast} garment={garment} />
      </svg>
    </span>
  </span>;
}
`;
const header = `// Generated from the uploaded handoff by scripts/build/extract-character-artwork.mjs.\nimport React, { type CSSProperties, type HTMLAttributes } from 'react';\nimport './xoot-character.css';\n\nexport interface XootCharacterProps extends HTMLAttributes<HTMLSpanElement> {\n  scene?: 'xooter' | 'host' | 'customer' | 'pair';\n  castIndex?: number;\n  garment?: 'violet' | 'blush' | 'sage' | 'honey' | 'mist' | 'moss' | 'petal';\n  size?: number;\n  motion?: 'idle' | 'sway' | 'none';\n  delay?: number;\n  style?: CSSProperties;\n}\n\n`;
writeFileSync('src/components/kit/XootCharacter.tsx', header + body.trimEnd() + '\n');
