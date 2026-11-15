// A small, safe markdown renderer for bounty descriptions and rules.
// The input is escaped first, so nothing in an API answer can inject markup;
// only the constructs below ever become tags. Supports headings, paragraphs,
// bullet and numbered lists, rules, quote blocks, fenced code, simple tables,
// and inline code, bold, italic and links (http(s) and in-app hash links only).

import { esc } from './format.js';

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+|#[^)\s]*)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

const isTableRow = (line) => /^\|.*\|$/.test(line.trim());
const isTableDivider = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

function tableHtml(rows) {
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
  const head = cells(rows[0]).map((c) => `<th>${c}</th>`).join('');
  const body = rows
    .slice(2)
    .map((row) => `<tr>${cells(row).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="mdtable"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Render markdown text to an HTML string (input is untrusted API text). */
export function md(source) {
  const lines = esc(source ?? '').split('\n');
  const out = [];
  let paragraph = [];
  let list = null; // 'ul' | 'ol'
  let code = null; // array of lines while inside a fence
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (code !== null) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${code.join('\n')}</code></pre>`);
        code = null;
      } else code.push(line);
      continue;
    }
    if (/^```/.test(line)) {
      flushParagraph();
      flushList();
      code = [];
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushParagraph();
      flushList();
      const rows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      i--;
      out.push(tableHtml(rows));
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 1, 4); // page title is the h1
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      flushList();
      out.push('<hr>');
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        flushList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet || numbered)[1])}</li>`);
      continue;
    }
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    paragraph.push(line.trim());
  }
  if (code !== null) out.push(`<pre><code>${code.join('\n')}</code></pre>`);
  flushParagraph();
  flushList();
  return out.join('\n');
}
