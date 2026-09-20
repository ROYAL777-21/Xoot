import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const path = 'design/handoff-2026-09-03/xoot/ds-bundle.js';
const source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['FLAP_CHARS', 'ROWS', 'COLS', 'BASE_COL_DELAY', 'BASE_ROW_DELAY', 'BASE_STEP_MS', 'BASE_FLIP_S', 'BASE_TOTAL_S', 'ACCENTS', 'prefersReduced', 'FlapCell', 'wrapParagraph', 'TextFlippingBoard']);
const selected = [];
function select(node) {
  const name = ts.isFunctionDeclaration(node) ? node.name?.text : ts.isVariableStatement(node) ? node.declarationList.declarations[0].name.getText(tree) : '';
  if (names.has(name) && !selected.some(item => item.name === name)) selected.push({name, node});
  else ts.forEachChild(node, select);
}
select(tree);
if (selected.length !== names.size) throw new Error('Original board definitions changed; review extraction.');
let body = selected.map(({node}) => node.getText(tree)).join('\n\n').replaceAll('/*#__PURE__*/', '');
body = body.replace('function TextFlippingBoard({', 'export function TextFlippingBoard({').replace('  duration = BASE_TOTAL_S,\n  style = {}\n})', '  duration = BASE_TOTAL_S,\n  style = {}\n}: { text?: string; duration?: number; style?: React.CSSProperties })');
writeFileSync('src/components/kit/TextFlippingBoard.tsx', '// Generated from the uploaded handoff by scripts/build/extract-flipping-board.mjs.\nimport React from "react";\n\n' + body + '\n');
