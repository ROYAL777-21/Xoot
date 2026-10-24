import { JSDOM } from 'jsdom';

export function publicHtmlPath(path) {
  if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/|$))*$/.test(path)) {
    throw new Error(`Unsafe public render path: ${path}`);
  }
  return path === '/' ? 'index.html' : `_public/${path.slice(1)}.html`;
}

export function composePublicHtml(template, { path, html, head, css = [] }) {
  publicHtmlPath(path);
  if ((template.match(/<div id="root"><\/div>/g) ?? []).length !== 1 || !template.includes('</head>')) {
    throw new Error('Public rendering requires the original, empty client shell');
  }
  const existingCss = new Set([...template.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)].map(match => match[1]));
  const styles = [...new Set(css)].filter(file => {
    if (!/^assets\/[a-zA-Z0-9_./-]+\.css$/.test(file) || file.includes('..')) throw new Error('Unsafe public stylesheet path');
    return !existingCss.has(`/${file}`);
  }).map(file => `<link rel="stylesheet" href="/${file}">`).join('');
  // Replace only metadata owned by SEO; retain the original scripts, fonts, icons and viewport.
  const clean = template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:(?:title|description|image|card))["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '');
  const output = clean.replace('</head>', () => `${head}${styles}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${html}</div>`);
  const dom = new JSDOM(output);
  try {
    validatePublicDocument(dom.window.document, path);
    dom.window.document.getElementById('root').setAttribute('data-xoot-public-page', path);
    // createRoot replaces static markup. Prevent input before the real handlers exist,
    // so a slow module download cannot discard a visitor's address or feedback.
    for (const control of dom.window.document.querySelectorAll('input, textarea, select, button')) {
      control.setAttribute('disabled', '');
    }
    return dom.serialize();
  } finally { dom.window.close(); }
}

export function validatePublicHtml(html, path) {
  const dom = new JSDOM(html); // Parse only: never execute scripts or load resources.
  try { validatePublicDocument(dom.window.document, path); }
  finally { dom.window.close(); }
}

function validatePublicDocument(doc, path) {
    const requireOne = selector => {
      const elements = doc.querySelectorAll(selector);
      if (elements.length !== 1) throw new Error(`${path}: expected one ${selector}, found ${elements.length}`);
      return elements[0];
    };
    const canonical = `https://xoot.co.za${path}`;
    if (!requireOne('title').textContent?.trim()) throw new Error(`${path}: missing title`);
    if (requireOne('link[rel="canonical"]').getAttribute('href') !== canonical) throw new Error(`${path}: wrong canonical`);
    if (requireOne('meta[property="og:url"]').getAttribute('content') !== canonical) throw new Error(`${path}: wrong social URL`);
    if (!requireOne('meta[name="description"]').getAttribute('content')?.trim()) throw new Error(`${path}: missing description`);
    if (requireOne('meta[name="robots"]').getAttribute('content') !== 'index,follow') throw new Error(`${path}: public page is not indexable`);
    const main = requireOne('#root main');
    if (!requireOne('#root h1').textContent?.trim() || main.textContent.trim().length < 60 || !doc.querySelector('#root a[href^="/"]')) {
      throw new Error(`${path}: missing readable public content or internal links`);
    }
    for (const script of doc.querySelectorAll('script')) {
      if (script.getAttribute('type') === 'application/ld+json') JSON.parse(script.textContent);
      else if (!script.getAttribute('src')) throw new Error(`${path}: executable inline script in public HTML`);
    }
}
