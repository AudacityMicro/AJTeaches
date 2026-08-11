"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_RESOURCES } from "../lib/content";
import { renderMarkdown as renderMarkdownDocument } from "../lib/markdown";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function renderMarkdown(markdown: string) {
  return renderMarkdownDocument(markdown);

  return markdown.split("\n").map((line) => {
    const safe = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1 ↗</a>');
    if (safe.startsWith("### ")) return `<h3>${safe.slice(4)}</h3>`;
    if (safe.startsWith("## ")) return `<h2>${safe.slice(3)}</h2>`;
    if (safe.startsWith("# ")) return `<h1>${safe.slice(2)}</h1>`;
    if (safe.startsWith("> ")) return `<blockquote>${safe.slice(2)}</blockquote>`;
    if (safe.startsWith("- ")) return `<li>${safe.slice(2)}</li>`;
    if (!safe.trim()) return "<div class=\"markdown-spacer\"></div>";
    return `<p>${safe.replace(/  $/, "<br />")}</p>`;
  }).join("").replace(/(<li>[\s\S]*?<\/li>)+/g, (list) => `<ul>${list}</ul>`);
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? "Something went wrong. Please try again.";
}

export default function ResourcesPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_RESOURCES);
  const [draftMarkdown, setDraftMarkdown] = useState(DEFAULT_RESOURCES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [editorStatus, setEditorStatus] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/content?section=resources"), fetch("/api/auth/session")]).then(async ([contentResponse, sessionResponse]) => {
      const content = await contentResponse.json().catch(() => null) as { markdown?: string } | null;
      const session = await sessionResponse.json().catch(() => null) as { authenticated?: boolean } | null;
      if (!active) return;
      if (content?.markdown) { setMarkdown(content.markdown); setDraftMarkdown(content.markdown); }
      setIsAdmin(Boolean(session?.authenticated));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoginError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { setLoginError(await responseError(response)); return; }
    setIsAdmin(true); setLoginOpen(false); setPassword("");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
  };

  const saveMarkdown = async () => {
    setEditorStatus("Publishing your update...");
    const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "resources", markdown: draftMarkdown }) });
    if (!response.ok) { setEditorStatus(await responseError(response)); return; }
    setMarkdown(draftMarkdown); setEditorStatus("Published successfully. Everyone can see these resources now.");
  };

  return <main className="site-shell">
    <header className="topbar"><a className="wordmark" href="/" aria-label="Aj's Class home"><span className="wordmark-mark">✳</span><span>Aj's Class</span></a><nav className="top-nav" aria-label="Main navigation"><a href="/">Board</a><a href="/resources">Resources</a><a href="/#write">Write a note</a><a href="/#updates">Get updates</a></nav>{isAdmin ? <button className="admin-pill signed-in" onClick={handleLogout}><span className="status-dot" /> Teacher mode · Log out</button> : <button className="admin-pill" onClick={() => setLoginOpen(true)}>Teacher login <span aria-hidden="true">↗</span></button>}</header>
    <section className="resources-page"><a className="back-link" href="/">← Back to board</a><div className="resources-card">{isAdmin ? <div className="editor-wrap"><div className="editor-topline"><span>Markdown editor</span><span>Teacher mode</span></div><textarea aria-label="Edit links and resources markdown" className="markdown-editor" value={draftMarkdown} onChange={(event) => setDraftMarkdown(event.target.value)} /><div className="editor-actions"><span>{editorStatus || "Changes publish for everyone."}</span><button className="button button-dark" onClick={saveMarkdown}>Publish resources <span>↗</span></button></div></div> : <article className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />}</div></section>
    <footer className="site-footer"><span>✳ Aj's Class</span><span>Open notes · 2026</span><a href="#top">Back to top ↑</a></footer>
    {loginOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginOpen(false)}><div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close login">×</button><p className="eyebrow muted">TEACHER ACCESS</p><h2 id="login-title">Welcome back.</h2><p className="login-copy">Sign in to update links and resources.</p><form onSubmit={handleLogin}><label>Password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></label>{loginError && <p className="login-error">{loginError}</p>}<button className="button button-dark" type="submit">Enter teacher mode <span>↗</span></button></form><p className="demo-hint">Teacher login is configured by the site owner.</p></div></div>}
  </main>;
}
