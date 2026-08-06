"use client";

import { FormEvent, useEffect, useState } from "react";

const DEFAULT_RESOURCES = `# Links & resources

Use this page for readings, documents, and tools worth returning to.

## Helpful links

- [Markdown Guide](https://www.markdownguide.org/basic-syntax/) — a quick reference for formatting
- [Google Drive](https://drive.google.com/) — shared documents and files
- [Khan Academy](https://www.khanacademy.org/) — free lessons and practice

## A place to keep growing

Add a short description beneath each link so it is easy to know where to start.`;

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function renderMarkdown(markdown: string) {
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

export default function ResourcesPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_RESOURCES), [draftMarkdown, setDraftMarkdown] = useState(DEFAULT_RESOURCES), [isAdmin, setIsAdmin] = useState(false), [loginOpen, setLoginOpen] = useState(false), [password, setPassword] = useState(""), [loginError, setLoginError] = useState("");
  useEffect(() => { const savedMarkdown = window.localStorage.getItem("class-resources-markdown"); if (savedMarkdown) { setMarkdown(savedMarkdown); setDraftMarkdown(savedMarkdown); } if (window.localStorage.getItem("commons-admin") === "true") setIsAdmin(true); }, []);
  const handleLogin = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (password === "welcome123") { setIsAdmin(true); window.localStorage.setItem("commons-admin", "true"); setLoginOpen(false); setPassword(""); setLoginError(""); } else setLoginError("That password didn’t match. Try again."); };
  const saveMarkdown = () => { setMarkdown(draftMarkdown); window.localStorage.setItem("class-resources-markdown", draftMarkdown); };

  return <main className="site-shell">
    <header className="topbar"><a className="wordmark" href="/" aria-label="Aj's Class home"><span className="wordmark-mark">✳</span><span>Aj's Class</span></a><nav className="top-nav" aria-label="Main navigation"><a href="/">Board</a><a href="/#write">Write a note</a><a href="/#updates">Get updates</a></nav>{isAdmin ? <button className="admin-pill signed-in" onClick={() => { setIsAdmin(false); window.localStorage.removeItem("commons-admin"); }}><span className="status-dot" /> Teacher mode · Log out</button> : <button className="admin-pill" onClick={() => setLoginOpen(true)}>Teacher login <span aria-hidden="true">↗</span></button>}</header>
    <section className="resources-page"><a className="back-link" href="/">← Back to board</a><div className="resources-card">{isAdmin ? <div className="editor-wrap"><div className="editor-topline"><span>Markdown editor</span><span>Teacher mode</span></div><textarea aria-label="Edit links and resources markdown" className="markdown-editor" value={draftMarkdown} onChange={(event) => setDraftMarkdown(event.target.value)} /><div className="editor-actions"><span>Changes save to this browser in demo mode.</span><button className="button button-dark" onClick={saveMarkdown}>Publish resources <span>↗</span></button></div></div> : <article className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />}</div></section>
    <footer className="site-footer"><span>✳ Aj's Class</span><span>Open notes · 2026</span><a href="#top">Back to top ↑</a></footer>
    {loginOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginOpen(false)}><div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close login">×</button><p className="eyebrow muted">TEACHER ACCESS</p><h2 id="login-title">Welcome back.</h2><p className="login-copy">Sign in to update links and resources.</p><form onSubmit={handleLogin}><label>Password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></label>{loginError && <p className="login-error">{loginError}</p>}<button className="button button-dark" type="submit">Enter teacher mode <span>↗</span></button></form><p className="demo-hint">Demo password: <strong>welcome123</strong></p></div></div>}
  </main>;
}
