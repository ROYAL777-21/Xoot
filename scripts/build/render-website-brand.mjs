// Website icons from the supplied Logo.jsx letterforms, not the legacy Z or native mascot.
// Isolated tooling: fontkit@2.0.4 and @resvg/resvg-js@2.6.2; no runtime dependencies added.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.ok(process.env.XOOT_WEB_BRAND_TOOLING_DIR, 'Set XOOT_WEB_BRAND_TOOLING_DIR to an isolated tooling directory');
const requireTool = createRequire(path.join(path.resolve(process.env.XOOT_WEB_BRAND_TOOLING_DIR), 'package.json'));
const fontkit = requireTool('fontkit');
const { Resvg } = requireTool('@resvg/resvg-js');
const fontPath = path.join(root, 'design/handoff-2026-09-03/xoot/assets/fonts/Caveat[wght].ttf');
const font = fontkit.openSync(fontPath).getVariation({ wght: 600 });
const run = font.layout('Xoot');
const advance = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
assert.ok(run.glyphs.length === 4 && advance > 0);
let cursor = 0;
const outlines = run.glyphs.map((glyph, index) => {
  const position = run.positions[index];
  const element = `<path transform="translate(${cursor + position.xOffset} ${position.yOffset})" d="${glyph.path.toSVG()}"/>`;
  cursor += position.xAdvance;
  return element;
}).join('');
const letters = (baseline, colour, opacity = 1) => `<g fill="${colour}" opacity="${opacity}" transform="translate(12 ${baseline}) scale(${76 / advance} ${-46 / font.unitsPerEm})">${outlines}</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100"><title>Xoot</title>
<!-- Caveat 600 from the approved September handoff; original SVG icon textLength 76, baseline 64. -->
<defs><linearGradient id="ground" x1="0.15" y1="0" x2="0" y2="1"><stop stop-color="#8D73FC"/><stop offset=".46" stop-color="#7C5CFC"/><stop offset="1" stop-color="#664BCE"/></linearGradient><radialGradient id="shine" cx="42%" cy="78%" r="70%"><stop stop-color="white" stop-opacity=".42"/><stop offset=".46" stop-color="white" stop-opacity=".12"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><clipPath id="tile"><rect width="100" height="100" rx="22.5"/></clipPath></defs>
<g clip-path="url(#tile)"><rect width="100" height="100" fill="url(#ground)"/><ellipse cx="50" cy="4" rx="68" ry="46" fill="url(#shine)"/><rect x=".4" y=".4" width="99.2" height="99.2" rx="22.1" fill="none" stroke="white" stroke-opacity=".25" stroke-width=".8"/>${letters(65.6, '#141210', .26)}${letters(64, '#FFFFFF')}</g></svg>\n`;
const output = path.join(root, 'public');
writeFileSync(path.join(output, 'xoot-icon.svg'), svg);
// Keep the previous URL usable for existing installed clients, with the corrected art.
writeFileSync(path.join(output, 'zoot-icon.svg'), svg);
const raster = size => new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) writeFileSync(path.join(output, name), raster(size));
const sizes = [16, 32, 48];
const pngs = sizes.map(raster);
const ico = Buffer.alloc(6 + sizes.length * 16); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(sizes.length, 4);
let offset = ico.length;
sizes.forEach((size, index) => { const at = 6 + index * 16; ico[at] = size; ico[at + 1] = size; ico.writeUInt16LE(1, at + 4); ico.writeUInt16LE(32, at + 6); ico.writeUInt32LE(pngs[index].length, at + 8); ico.writeUInt32LE(offset, at + 12); offset += pngs[index].length; });
writeFileSync(path.join(output, 'favicon.ico'), Buffer.concat([ico, ...pngs]));
const word = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 100 40"><title>Xoot</title><g fill="#7C5CFC" transform="translate(2 32) scale(${96 / advance} ${-46 / font.unitsPerEm})">${outlines}</g></svg>\n`;
mkdirSync(path.join(output, 'images'), { recursive: true });
writeFileSync(path.join(output, 'images/xoot-wordmark.svg'), word);
writeFileSync(path.join(output, 'images/xoot-wordmark.png'), new Resvg(word, { font: { loadSystemFonts: false } }).render().asPng());
console.log(JSON.stringify({ brand: 'Xoot', source: 'handoff Caveat weight 600', fontSha256: createHash('sha256').update(readFileSync(fontPath)).digest('hex'), websiteOnly: true, sizes }));
