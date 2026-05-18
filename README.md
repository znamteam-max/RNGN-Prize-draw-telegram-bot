# Telegram Contest Bot for Instagram Giveaways

Telegram bot and admin panel for prize draws where eligibility is checked against official Instagram follower export files.

The bot collects Telegram users and their Instagram usernames. Admins upload followers exports for two Instagram accounts at the start, middle, and final stages. The final check decides who receives `approved_final` and can enter the random draw.

## Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Telegram Bot API webhook
- Vercel-ready API routes and admin pages

## MVP Features

- `/api/telegram/webhook` for Telegram updates
- `/start`, participation flow, Instagram username normalization
- Admin import for official Instagram exports: JSON, CSV, TXT
- Three check stages: `start`, `middle`, `final`
- Middle-stage reminders for not-yet-approved participants
- Final draw only among `approved_final`
- CSV exports for entries, eligible participants, rejected participants, and draw results
- Public rules page at `/rules`
- Admin dashboard at `/admin`

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Required environment variables:

```env
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ADMIN_TOKEN=
ADMIN_TELEGRAM_IDS=
CONTEST_TITLE=
CONTEST_INSTAGRAM_1=
CONTEST_INSTAGRAM_2=
```

`ADMIN_TOKEN` protects API calls through the `x-admin-token` header or `Authorization: Bearer ...`. For production, put `/admin` and `/api/admin/*` behind Cloudflare Access or another trusted access layer.

## Telegram Webhook

After deploy, register the public webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://your-domain.com/api/telegram/webhook","secret_token":"your-secret"}'
```

## Instagram Export Formats

The parser accepts:

- JSON from Instagram / Meta Accounts Center exports
- CSV with a `username` column
- TXT with one username per line

All usernames are normalized to lowercase, without `@`, with profile URLs reduced to the first path segment.

## Admin API

```text
POST /api/admin/import
POST /api/admin/checks/run
POST /api/admin/notifications/middle
POST /api/admin/draw
GET  /api/admin/export?type=all|eligible|rejected|result
```

Final draw refuses to run if there are no `approved_final` entries.
