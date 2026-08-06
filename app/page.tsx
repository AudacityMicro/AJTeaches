"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const DEFAULT_MARKDOWN = `# A note for this week

Welcome back, everyone. Here’s the latest note, with a few things to keep in mind before our next gathering.

## Before we meet again

- Bring one question that stayed with you
- Add a thought to the conversation
- Be ready to share, or just listen

> Small questions can open up the biggest conversations.

See you soon,  
**Aj's Class**`;

type RetentionOption = "week" | "two-weeks" | "month" | "custom";
const retentionLabels: Record<RetentionOption, string> = { week: "1 week", "two-weeks": "2 weeks", month: "1 month", custom: "Choose a date" };

function formatDate(date: Date) { return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date); }
function dateForRetention(option: RetentionOption, customDate: string) {
  const date = new Date();
  if (option === "week") date.setDate(date.getDate() + 7);
  if (option === "two-weeks") date.setDate(date.getDate() + 14);
  if (option === "month") date.setMonth(date.getMonth() + 1);
  if (option === "custom" && customDate) return new Date(`${customDate}T23:59:59`);
  return date;
}
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function renderMarkdown(markdown: string) {
  return markdown.split("\n").map((line) => {
    const safe = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (safe.startsWith("### ")) return `<h3>${safe.slice(4)}</h3>`;
    if (safe.startsWith("## ")) return `<h2>${safe.slice(3)}</h2>`;
    if (safe.startsWith("# ")) return `<h1>${safe.slice(2)}</h1>`;
    if (safe.startsWith("> ")) return `<blockquote>${safe.slice(2)}</blockquote>`;
    if (safe.startsWith("- ")) return `<li>${safe.slice(2)}</li>`;
    if (!safe.trim()) return "<div class=\"markdown-spacer\"></div>";
    return `<p>${safe.replace(/  $/, "<br />")}</p>`;
  }).join("").replace(/(<li>[\s\S]*?<\/li>)+/g, (list) => `<ul>${list}</ul>`);
}

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN), [draftMarkdown, setDraftMarkdown] = useState(DEFAULT_MARKDOWN), [isAdmin, setIsAdmin] = useState(false), [loginOpen, setLoginOpen] = useState(false), [password, setPassword] = useState(""), [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState(""), [messageName, setMessageName] = useState(""), [messageSent, setMessageSent] = useState(false), [email, setEmail] = useState(""), [retention, setRetention] = useState<RetentionOption>("week"), [customDate, setCustomDate] = useState(""), [subscribed, setSubscribed] = useState(false);

  useEffect(() => { const savedMarkdown = window.localStorage.getItem("commons-markdown"); if (savedMarkdown) { setMarkdown(savedMarkdown); setDraftMarkdown(savedMarkdown); } if (window.localStorage.getItem("commons-admin") === "true") setIsAdmin(true); }, []);
  const expirationDate = useMemo(() => dateForRetention(retention, customDate), [retention, customDate]);
  const handleLogin = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (password === "welcome123") { setIsAdmin(true); window.localStorage.setItem("commons-admin", "true"); setLoginOpen(false); setPassword(""); setLoginError(""); } else setLoginError("That password didn’t match. Try again."); };
  const saveMarkdown = () => { setMarkdown(draftMarkdown); window.localStorage.setItem("commons-markdown", draftMarkdown); };
  const handleMessage = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessageSent(true); setMessage(""); setMessageName(""); };
  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubscribed(true); setEmail(""); };

  return <main className="site-shell">
    <header className="topbar"><a className="wordmark" href="#top" aria-label="Aj's Class home"><span className="wordmark-mark">✳</span><span>Aj's Class</span></a><nav className="top-nav" aria-label="Main navigation"><a href="#board">Board</a><a href="/resources">Resources</a><a href="#write">Write a note</a><a href="#updates">Get updates</a></nav>{isAdmin ? <button className="admin-pill signed-in" onClick={() => { setIsAdmin(false); window.localStorage.removeItem("commons-admin"); }}><span className="status-dot" /> Teacher mode · Log out</button> : <button className="admin-pill" onClick={() => setLoginOpen(true)}>Teacher login <span aria-hidden="true">↗</span></button>}</header>
    <section className="board-section" id="board"><div className="board-status"><span className="updated-label">Updated just now <span className="pulse" /></span></div><div className="board-card"><div className="card-rail"><span className="pin" /><span className="date-label">06<br /><small>AUG</small></span></div><div className="card-content">{isAdmin ? <div className="editor-wrap"><div className="editor-topline"><span>Markdown editor</span><span>Teacher mode</span></div><textarea aria-label="Edit the board markdown" className="markdown-editor" value={draftMarkdown} onChange={(event) => setDraftMarkdown(event.target.value)} /><div className="editor-actions"><span>Changes save to this browser in demo mode.</span><button className="button button-dark" onClick={saveMarkdown}>Publish update <span>↗</span></button></div></div> : <article className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />}</div></div></section>
    <section className="connect-section" id="write"><div className="forms-column"><form className="message-form form-card" onSubmit={handleMessage}><div className="form-card-heading"><span className="form-number">01</span><h3>Write a note</h3></div>{messageSent ? <div className="success-state"><span className="success-check">✓</span><div><strong>Note sent.</strong><p>Thanks for adding your voice to the room.</p></div><button type="button" className="text-button" onClick={() => setMessageSent(false)}>Send another</button></div> : <><label>Your name <span>(optional)</span><input value={messageName} onChange={(event) => setMessageName(event.target.value)} placeholder="e.g. Jordan" /></label><label>Message <textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What’s on your mind?" rows={4} /></label><button className="button button-coral" type="submit">Send privately <span>↗</span></button></>}</form><form className="updates-form form-card" id="updates" onSubmit={handleSubscribe}><div className="form-card-heading"><span className="form-number">02</span><h3>Get updates</h3></div>{subscribed ? <div className="success-state"><span className="success-check coral-check">✓</span><div><strong>You’re on the list.</strong><p>We’ll keep your email until {formatDate(expirationDate)}.</p></div><button type="button" className="text-button" onClick={() => setSubscribed(false)}>Change signup</button></div> : <><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><fieldset><legend>Keep me posted for…</legend><div className="retention-grid">{(Object.keys(retentionLabels) as RetentionOption[]).map((option) => <button type="button" key={option} className={`retention-option ${retention === option ? "selected" : ""}`} onClick={() => setRetention(option)}>{retentionLabels[option]}{option === "week" && <span className="default-tag">default</span>}</button>)}</div></fieldset>{retention === "custom" && <label>Remove my email on<input required type="date" min={new Date().toISOString().slice(0, 10)} value={customDate} onChange={(event) => setCustomDate(event.target.value)} /></label>}<p className="expiration-copy">Your email will be removed on <strong>{formatDate(expirationDate)}</strong>.</p><button className="button button-dark" type="submit">Sign me up <span>↗</span></button></>}</form></div></section>
    <footer className="site-footer"><span>✳ Aj's Class</span><span>Open notes · 2026</span><a href="#top">Back to top ↑</a></footer>
    {loginOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginOpen(false)}><div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close login">×</button><p className="eyebrow muted">TEACHER ACCESS</p><h2 id="login-title">Welcome back.</h2><p className="login-copy">Sign in to update the board’s Markdown.</p><form onSubmit={handleLogin}><label>Password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></label>{loginError && <p className="login-error">{loginError}</p>}<button className="button button-dark" type="submit">Enter teacher mode <span>↗</span></button></form><p className="demo-hint">Demo password: <strong>welcome123</strong></p></div></div>}
  </main>;
}
