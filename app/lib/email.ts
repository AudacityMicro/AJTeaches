import { Resend } from "resend";
import { activeSubscribers } from "./database";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return undefined;
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Aj's Class <onboarding@resend.dev>";
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  const resend = client();
  if (!resend) return { sent: false, reason: "not_configured" as const };
  const result = await resend.emails.send({ from: fromAddress(), to, subject, text, html });
  if (result.error) throw new Error(result.error.message);
  return { sent: true as const };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function plainMarkdown(markdown: string) {
  return markdown.replace(/[`*_>#-]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
}

export async function notifyAdminOfMessage(senderName: string, message: string) {
  const recipient = process.env.ADMIN_EMAIL;
  if (!recipient) return { sent: false, reason: "not_configured" as const };
  return sendEmail(
    recipient,
    "A new private note was sent to Aj's Class",
    `${senderName ? `${senderName} wrote:\n\n` : "A student wrote:\n\n"}${message}`,
    `<p>${senderName ? `${escapeHtml(senderName)} wrote:` : "A student wrote:"}</p><p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>`,
  );
}

export async function notifySubscribersOfUpdate(markdown: string) {
  const subscribers = await activeSubscribers();
  if (!isEmailConfigured() || subscribers.length === 0) return { sent: 0, skipped: subscribers.length, configured: isEmailConfigured() };
  const text = `There’s a new update on Aj's Class:\n\n${plainMarkdown(markdown)}\n\nVisit the board to read it.`;
  const html = `<p>There’s a new update on Aj's Class:</p><p>${escapeHtml(plainMarkdown(markdown)).replaceAll("\n", "<br />")}</p><p>Visit the board to read it.</p>`;
  const results = await Promise.allSettled(subscribers.map((subscriber) => sendEmail(subscriber.email, "A new update from Aj's Class", text, html)));
  return { sent: results.filter((result) => result.status === "fulfilled" && result.value.sent).length, skipped: 0, configured: true };
}
