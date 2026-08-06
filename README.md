# Aj's Class

A single-page classroom message board for announcements, private student notes, and temporary email notifications.

The `/resources` page provides a second, wide Markdown section for links and references.

## Run locally

This project uses Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Build and verify the production bundle with:

```bash
pnpm test
```

## Railway

Railway can deploy this repository as a Node service. The included `package.json` provides `build` and `start` scripts, and `pnpm-lock.yaml` pins the dependency tree. Set the service start command to `pnpm start` if Railway does not detect it automatically.

## Production setup

The app uses a Railway Postgres database and Resend for email. The database tables are created automatically the first time the app receives a request.

Copy `.env.example` to `.env.local` for local development, or add the same variables under the Railway service's Variables tab:

- `DATABASE_URL` — Railway provides this when you add a PostgreSQL service to the project.
- `RESEND_API_KEY` — Resend sending API key.
- `EMAIL_FROM` — a sender address on a verified Resend domain.
- `ADMIN_EMAIL` — where private student notes should be delivered.
- `ADMIN_PASSWORD` — the teacher password.
- `SESSION_SECRET` — a long random value used to sign the teacher session cookie.

Railway can provision PostgreSQL directly in the project. Its Hobby plan includes monthly usage credit, but the plan itself is paid and extra database/app usage can exceed that credit. Add the PostgreSQL template from the project canvas and make sure its persistent volume is attached. Resend has a free email tier. Resend's `onboarding@resend.dev` sender is available for testing, but Resend restricts that sender to the email address on the Resend account; to email students, verify a domain and set `EMAIL_FROM` to an address on it.

The app stores published board/resources Markdown, private notes, and expiring notification subscriptions in Postgres. Publishing the board sends an email to active subscribers, and expired subscriptions are removed when the subscription list is used.
