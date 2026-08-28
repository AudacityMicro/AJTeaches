"use client";

import { RefObject } from "react";

type MarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
};

type InlineAction = {
  label: string;
  title: string;
  before: string;
  after: string;
  placeholder: string;
};

const inlineActions: InlineAction[] = [
  { label: "B", title: "Bold", before: "**", after: "**", placeholder: "bold text" },
  { label: "I", title: "Italic", before: "*", after: "*", placeholder: "italic text" },
  { label: "U", title: "Underline", before: "<u>", after: "</u>", placeholder: "underlined text" },
  { label: "S", title: "Strikethrough", before: "~~", after: "~~", placeholder: "struck text" },
];

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextLine = value.indexOf("\n", end);
  return { start: lineStart, end: nextLine === -1 ? value.length : nextLine };
}

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const replaceSelection = (before: string, after = "", placeholder = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const content = selected || placeholder;
    const nextValue = `${value.slice(0, start)}${before}${content}${after}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const contentStart = start + before.length;
      textarea.setSelectionRange(contentStart, contentStart + content.length);
    });
  };

  const prefixLines = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const bounds = lineBounds(value, textarea.selectionStart, textarea.selectionEnd);
    const selectedLines = value.slice(bounds.start, bounds.end);
    const lines = selectedLines.split("\n");
    const alreadyPrefixed = lines.every((line) => line.startsWith(prefix));
    const replacement = lines.map((line) => alreadyPrefixed ? line.slice(prefix.length) : `${prefix}${line}`).join("\n");
    const nextValue = `${value.slice(0, bounds.start)}${replacement}${value.slice(bounds.end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(bounds.start, bounds.start + replacement.length);
    });
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "link text";
    const before = `[${selected}](`;
    const after = ")";
    const nextValue = `${value.slice(0, start)}${before}https://example.com${after}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const urlStart = start + before.length;
      textarea.setSelectionRange(urlStart, urlStart + "https://example.com".length);
    });
  };

  return <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting tools">
    <div className="markdown-tool-group">
      {inlineActions.map((action) => <button key={action.label} type="button" className={`markdown-tool markdown-tool-${action.label.toLowerCase()}`} title={action.title} aria-label={action.title} onMouseDown={(event) => event.preventDefault()} onClick={() => replaceSelection(action.before, action.after, action.placeholder)}>{action.label}</button>)}
    </div>
    <div className="markdown-tool-group">
      <button type="button" className="markdown-tool" title="Heading" aria-label="Heading" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines("## ")}>H2</button>
      <button type="button" className="markdown-tool" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines("- ")}>•</button>
      <button type="button" className="markdown-tool" title="Numbered list" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines("1. ")}>1.</button>
      <button type="button" className="markdown-tool" title="Checklist" aria-label="Checklist" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines("- [ ] ")}>☑</button>
      <button type="button" className="markdown-tool" title="Quote" aria-label="Quote" onMouseDown={(event) => event.preventDefault()} onClick={() => prefixLines("> ")}>❯</button>
    </div>
    <div className="markdown-tool-group">
      <button type="button" className="markdown-tool markdown-tool-code" title="Inline code" aria-label="Inline code" onMouseDown={(event) => event.preventDefault()} onClick={() => replaceSelection("`", "`", "code")}>&lt;/&gt;</button>
      <button type="button" className="markdown-tool" title="Code block" aria-label="Code block" onMouseDown={(event) => event.preventDefault()} onClick={() => replaceSelection("```\n", "\n```", "code" )}>▣</button>
      <button type="button" className="markdown-tool" title="Insert link" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={insertLink}>↗</button>
      <button type="button" className="markdown-tool" title="Horizontal rule" aria-label="Horizontal rule" onMouseDown={(event) => event.preventDefault()} onClick={() => replaceSelection("\n---\n", "", "")}>―</button>
    </div>
  </div>;
}
