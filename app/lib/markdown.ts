function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderInline(value: string) {
  const placeholders: string[] = [];
  const stash = (html: string) => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return token;
  };

  let safe = escapeHtml(value);
  safe = safe.replace(/`([^`]+)`/g, (_match, code: string) => stash(`<code>${code}</code>`));
  safe = safe.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_match, alt: string, src: string) => stash(`<img src="${src}" alt="${alt}" loading="lazy" />`));
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, href: string) => stash(`<a href="${href}" target="_blank" rel="noreferrer">${label} ↗</a>`));
  safe = safe.replace(/\[\[([^\]]+)\]\]/g, (_match, label: string) => `<span class="markdown-wikilink">${label}</span>`);
  safe = safe.replace(/&lt;u&gt;([\s\S]+?)&lt;\/u&gt;/g, "<u>$1</u>");
  safe = safe.replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/~~(.+?)~~/g, "<del>$1</del>");
  safe = safe.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  safe = safe.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  safe = safe.replace(/  $/g, "<br />").replace(/\n/g, "<br />");

  return safe.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => placeholders[Number(index)] ?? "");
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return splitTableRow(line).length > 0 && splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(lines: string[]) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  return `<div class="markdown-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_header, index) => `<td>${renderInline(row[index] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      output.push(`<p>${renderInline(paragraph.join("\n"))}</p>`);
      paragraph = [];
    }
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      output.push("<div class=\"markdown-spacer\"></div>");
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const language = fence[1] ? ` data-language="${escapeHtml(fence[1])}"` : "";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      output.push(`<pre${language}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(\*\s*){3,}$/.test(trimmed) || /^(-\s*){3,}$/.test(trimmed) || /^(_\s*){3,}$/.test(trimmed)) {
      flushParagraph();
      output.push("<hr />");
      index += 1;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      flushParagraph();
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      output.push(renderTable(tableLines));
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      const callout = quoteLines[0]?.match(/^\[!([A-Z]+)\]\s*(.*)$/i);
      if (callout) {
        const kind = callout[1].toLowerCase();
        const title = callout[2] || callout[1].toLowerCase();
        output.push(`<aside class="markdown-callout markdown-callout-${escapeHtml(kind)}"><strong>${renderInline(title)}</strong><div>${renderInline(quoteLines.slice(1).join("\n"))}</div></aside>`);
      } else {
        output.push(`<blockquote>${renderInline(quoteLines.join("\n"))}</blockquote>`);
      }
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index].trim();
        const match = isOrdered ? current.match(/^\d+[.)]\s+(.+)$/) : current.match(/^[-*+]\s+(.+)$/);
        if (!match) break;
        const task = match[1].match(/^\[([ xX])\]\s+(.+)$/);
        items.push(task ? `<li class="task-item"><input type="checkbox" disabled ${task[1].toLowerCase() === "x" ? "checked" : ""} /><span>${renderInline(task[2])}</span></li>` : `<li>${renderInline(match[1])}</li>`);
        index += 1;
      }
      output.push(`<${isOrdered ? "ol" : "ul"}>${items.join("")}</${isOrdered ? "ol" : "ul"}>`);
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  return output.join("");
}
