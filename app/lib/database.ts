import postgres from "postgres";
import { DEFAULT_MARKDOWN, DEFAULT_RESOURCES, type ContentSection } from "./content";

type DatabaseClient = ReturnType<typeof postgres>;
type ContentRow = { markdown: string; updated_at: string };
type SubscriberRow = { email: string; expires_at: string };

let client: DatabaseClient | undefined;
let schemaReady: Promise<void> | undefined;

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  client ??= postgres(url, { max: 1, idle_timeout: 20 });
  return client;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureSchema() {
  if (!schemaReady) {
    const sql = database();
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS board_content (
        content_key TEXT PRIMARY KEY,
        markdown TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS message_notes (
        id BIGSERIAL PRIMARY KEY,
        sender_name TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS notification_subscribers (
        email TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`INSERT INTO board_content (content_key, markdown) VALUES ('board', ${DEFAULT_MARKDOWN}) ON CONFLICT (content_key) DO NOTHING`;
      await sql`INSERT INTO board_content (content_key, markdown) VALUES ('resources', ${DEFAULT_RESOURCES}) ON CONFLICT (content_key) DO NOTHING`;
    })();
  }
  await schemaReady;
}

export async function getContent(section: ContentSection) {
  await ensureSchema();
  const rows = await database()`SELECT markdown, updated_at FROM board_content WHERE content_key = ${section}` as unknown as ContentRow[];
  return rows[0] ?? { markdown: section === "board" ? DEFAULT_MARKDOWN : DEFAULT_RESOURCES, updated_at: new Date().toISOString() };
}

export async function saveContent(section: ContentSection, markdown: string) {
  await ensureSchema();
  const rows = await database()`UPDATE board_content SET markdown = ${markdown}, updated_at = NOW() WHERE content_key = ${section} RETURNING markdown, updated_at` as unknown as ContentRow[];
  return rows[0];
}

export async function saveMessage(senderName: string, message: string) {
  await ensureSchema();
  await database()`INSERT INTO message_notes (sender_name, message) VALUES (${senderName || null}, ${message})`;
}

export async function saveSubscriber(email: string, expiresAt: Date) {
  await ensureSchema();
  await database()`INSERT INTO notification_subscribers (email, expires_at) VALUES (${email}, ${expiresAt.toISOString()})
    ON CONFLICT (email) DO UPDATE SET expires_at = EXCLUDED.expires_at, updated_at = NOW()`;
}

export async function activeSubscribers() {
  await ensureSchema();
  const sql = database();
  await sql`DELETE FROM notification_subscribers WHERE expires_at <= NOW()`;
  return sql`SELECT email, expires_at FROM notification_subscribers WHERE expires_at > NOW() ORDER BY email` as unknown as SubscriberRow[];
}
