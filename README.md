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

## Current first version

- The teacher login opens the Markdown editor. The demo password is `welcome123`.
- Published Markdown and the teacher-mode toggle are saved in the current browser using `localStorage`.
- Student notes and email signups currently show an in-browser success state.
- The signup retention picker defaults to one week and supports two weeks, one month, or a custom removal date.

For a production launch, replace the demo storage with a Railway Postgres-backed API, move teacher authentication to the server, and connect the notification list to an email provider. The UI and form states are already separated so that wiring those endpoints in is straightforward.
