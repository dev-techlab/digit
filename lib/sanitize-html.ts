/**
 * Minimal allowlist HTML sanitizer for store-terms content (and any other
 * agent-authored rich text rendered via `dangerouslySetInnerHTML`).
 *
 * No DOM/parsing dependency is used (works identically server- and
 * client-side): tags are re-emitted from scratch from a small allowlist
 * rather than passed through, so no attacker-controlled attribute (onerror,
 * onclick, style, etc.) can ever survive — the only attribute kept is a
 * scheme-validated `href` on `<a>`. Disallowed tags are stripped but their
 * text kept; a handful of inherently dangerous tags (script/style/iframe/...)
 * have their entire subtree dropped.
 */

const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'h2',
  'h3',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'br',
  'div',
  'span',
  'p',
]);

const VOID_TAGS = new Set(['br']);

const DROP_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
  'noscript',
  'form',
]);

const SAFE_HREF = /^(https?:|mailto:|tel:|\/(?!\/)|#)/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractHref(attrs: string): string | null {
  const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
  if (!m) return null;
  // Strip control characters attackers use to smuggle `javascript:` past a naive scheme check.
  const cleaned = (m[2] ?? m[3] ?? m[4] ?? '').trim().replace(CONTROL_CHARS, '');
  return SAFE_HREF.test(cleaned) ? cleaned : null;
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';

  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\s*(\/?)>/g;
  let out = '';
  let lastIndex = 0;
  let dropTag: string | null = null;
  let dropDepth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(input))) {
    const text = input.slice(lastIndex, match.index);
    lastIndex = tagRe.lastIndex;
    if (!dropTag) out += escapeText(text);

    if (match[0].startsWith('<!--')) continue; // HTML comment — drop entirely

    const closing = match[1] === '/';
    const name = match[2].toLowerCase();
    const attrs = match[3] ?? '';
    const selfClosing = match[4] === '/';

    if (dropTag) {
      if (name === dropTag) {
        if (closing) {
          dropDepth -= 1;
          if (dropDepth <= 0) dropTag = null;
        } else if (!selfClosing) {
          dropDepth += 1;
        }
      }
      continue;
    }

    if (DROP_CONTENT_TAGS.has(name)) {
      if (!closing && !selfClosing) {
        dropTag = name;
        dropDepth = 1;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(name)) continue; // strip the tag, keep surrounding text

    if (closing) {
      if (!VOID_TAGS.has(name)) out += `</${name}>`;
      continue;
    }

    if (name === 'a') {
      const href = extractHref(attrs);
      out += href ? `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer">` : '<a>';
    } else {
      out += `<${name}>`;
    }
  }

  if (!dropTag) out += escapeText(input.slice(lastIndex));
  return out;
}
