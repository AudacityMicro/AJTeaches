"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_MARKDOWN } from "./lib/content";
import { renderMarkdown as renderMarkdownDocument } from "./lib/markdown";

type RetentionOption = "week" | "two-weeks" | "month" | "custom";

const retentionLabels: Record<RetentionOption, string> = {
  week: "1 week",
  "two-weeks": "2 weeks",
  month: "1 month",
  custom: "Choose a date",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function dateForRetention(option: RetentionOption, customDate: string) {
  const date = new Date();
  if (option === "week") date.setDate(date.getDate() + 7);
  if (option === "two-weeks") date.setDate(date.getDate() + 14);
  if (option === "month") date.setMonth(date.getMonth() + 1);
  if (option === "custom" && customDate) return new Date(`${customDate}T23:59:59`);
  return date;
}

function renderMarkdown(markdown: string) {
  return renderMarkdownDocument(markdown);
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? "Something went wrong. Please try again.";
}

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [draftMarkdown, setDraftMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [message, setMessage] = useState("");
  const [messageName, setMessageName] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [email, setEmail] = useState("");
  const [retention, setRetention] = useState<RetentionOption>("week");
  const [customDate, setCustomDate] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [confirmedExpiration, setConfirmedExpiration] = useState<Date | null>(null);
  const [formError, setFormError] = useState("");
  const [editorStatus, setEditorStatus] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/content?section=board"), fetch("/api/auth/session")]).then(async ([contentResponse, sessionResponse]) => {
      const content = await contentResponse.json().catch(() => null) as { markdown?: string } | null;
      const session = await sessionResponse.json().catch(() => null) as { authenticated?: boolean } | null;
      if (!active) return;
      if (content?.markdown) { setMarkdown(content.markdown); setDraftMarkdown(content.markdown); }
      setIsAdmin(Boolean(session?.authenticated));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const expirationDate = useMemo(() => dateForRetention(retention, customDate), [retention, customDate]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { setLoginError(await responseError(response)); return; }
    setIsAdmin(true); setLoginOpen(false); setPassword("");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
  };

  const saveMarkdown = () => {
    setPublishConfirmOpen(true);
  };

  const publishMarkdown = async (notifyStudents: boolean) => {
    setPublishConfirmOpen(false);
    setIsPublishing(true);
    setEditorStatus(notifyStudents ? "Publishing and notifying students..." : "Publishing without notifying students...");
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "board", markdown: draftMarkdown, notifySubscribers: notifyStudents }) });
      if (!response.ok) { setEditorStatus(await responseError(response)); return; }
      setMarkdown(draftMarkdown); setEditorStatus(notifyStudents ? "Published successfully. Students have been notified." : "Published successfully without notifying students.");
    } catch {
      setEditorStatus("The update could not be published. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError("");
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: messageName, message }) });
    if (!response.ok) { setFormError(await responseError(response)); return; }
    setMessageSent(true); setMessage(""); setMessageName("");
  };

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError("");
    const response = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, retention, customDate }) });
    if (!response.ok) { setFormError(await responseError(response)); return; }
    const data = await response.json() as { expiresAt: string };
    setConfirmedExpiration(new Date(data.expiresAt)); setSubscribed(true); setEmail("");
  };

  return <main className="site-shell">
    <header className="topbar"><a className="wordmark" href="#top" aria-label="Aj's Class home"><span className="wordmark-mark">✳</span><span>Aj's Class</span></a><nav className="top-nav" aria-label="Main navigation"><a href="#board">Board</a><a href="/resources">Resources</a><a href="#write">Write a note</a><a href="#updates">Get updates</a></nav>{isAdmin ? <button className="admin-pill signed-in" onClick={handleLogout}><span className="status-dot" /> Teacher mode · Log out</button> : <button className="admin-pill" onClick={() => setLoginOpen(true)}>Teacher login <span aria-hidden="true">↗</span></button>}</header>
    <section className="board-section" id="board"><div className="board-status"><span className="updated-label">Updated just now <span className="pulse" /></span></div><div className="board-card"><div className="card-rail"><span className="pin" /><span className="date-label">06<br /><small>AUG</small></span></div><div className="card-content">{isAdmin ? <div className="editor-wrap"><div className="editor-topline"><span>Markdown editor</span><span>Teacher mode</span></div><textarea aria-label="Edit the board markdown" className="markdown-editor" value={draftMarkdown} onChange={(event) => setDraftMarkdown(event.target.value)} /><div className="editor-actions"><span>{editorStatus || "Changes publish for everyone."}</span><button className="button button-dark" onClick={saveMarkdown}>Publish update <span>↗</span></button></div></div> : <article className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />}</div></div></section>
    <section className="connect-section" id="write"><div className="forms-column"><form className="message-form form-card" onSubmit={handleMessage}><div className="form-card-heading"><span className="form-number">01</span><h3>Write a note</h3></div>{messageSent ? <div className="success-state"><span className="success-check">✓</span><div><strong>Note sent.</strong><p>Your note was saved and sent to the teacher.</p></div><button type="button" className="text-button" onClick={() => setMessageSent(false)}>Send another</button></div> : <><label>Your name <span>(optional)</span><input value={messageName} onChange={(event) => setMessageName(event.target.value)} placeholder="e.g. Jordan" /></label><label>Message <textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What’s on your mind?" rows={4} /></label><button className="button button-coral" type="submit">Send privately <span>↗</span></button></>}</form><form className="updates-form form-card" id="updates" onSubmit={handleSubscribe}><div className="form-card-heading"><span className="form-number">02</span><h3>Get updates</h3></div>{subscribed ? <div className="success-state"><span className="success-check coral-check">✓</span><div><strong>You’re on the list.</strong><p>We’ll keep your email until {formatDate(confirmedExpiration ?? expirationDate)}.</p></div><button type="button" className="text-button" onClick={() => { setSubscribed(false); setConfirmedExpiration(null); }}>Change signup</button></div> : <><label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><fieldset><legend>Keep me posted for…</legend><div className="retention-grid">{(Object.keys(retentionLabels) as RetentionOption[]).map((option) => <button type="button" key={option} className={`retention-option ${retention === option ? "selected" : ""}`} onClick={() => { setRetention(option); setConfirmedExpiration(null); }}>{retentionLabels[option]}{option === "week" && <span className="default-tag">default</span>}</button>)}</div></fieldset>{retention === "custom" && <label>Remove my email on<input required type="date" min={new Date().toISOString().slice(0, 10)} value={customDate} onChange={(event) => { setCustomDate(event.target.value); setConfirmedExpiration(null); }} /></label>}<p className="expiration-copy">Your email will be removed on <strong>{formatDate(expirationDate)}</strong>.</p>{formError && <p className="login-error">{formError}</p>}<button className="button button-dark" type="submit">Sign me up <span>↗</span></button></>}</form>{formError && <p className="login-error">{formError}</p>}</div></section>
    <footer className="site-footer"><span>✳ Aj's Class</span><span>Open notes · 2026</span><a href="#top">Back to top ↑</a></footer>
    {loginOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginOpen(false)}><div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close login">×</button><p className="eyebrow muted">TEACHER ACCESS</p><h2 id="login-title">Welcome back.</h2><p className="login-copy">Sign in to update the board’s Markdown.</p><form onSubmit={handleLogin}><label>Password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></label>{loginError && <p className="login-error">{loginError}</p>}<button className="button button-dark" type="submit">Enter teacher mode <span>↗</span></button></form><p className="demo-hint">Teacher login is configured by the site owner.</p></div></div>}
    {publishConfirmOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setPublishConfirmOpen(false)}><div className="publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setPublishConfirmOpen(false)} aria-label="Close publish confirmation">x</button><p className="eyebrow muted">CONFIRM PUBLISH</p><h2 id="publish-title">How should this update go out?</h2><p className="login-copy">Choose whether the students currently signed up for updates should receive an email about this board post.</p><div className="publish-options"><button className="button button-coral" type="button" onClick={() => publishMarkdown(true)} disabled={isPublishing}>Publish and notify all students <span>-&gt;</span></button><button className="button button-dark" type="button" onClick={() => publishMarkdown(false)} disabled={isPublishing}>Publish without notifying students <span>-&gt;</span></button></div><button className="text-button publish-cancel" type="button" onClick={() => setPublishConfirmOpen(false)}>Cancel</button></div></div>}
  </main>;
}
