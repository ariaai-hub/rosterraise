# RosterRaise

MVP fundraising platform for team sports apparel.

## Tech Stack

- Next.js 14 (App Router)
- Prisma ORM
- PostgreSQL via Neon
- NextAuth v5 (JWT)
- Stripe for payments
- Resend for email

## Getting Started

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values.

## API Routes

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email
- `GET /api/auth/session` - Get current session
- `GET/POST /api/teams` - List/create teams
- `GET/PATCH /api/teams/[teamSlug]` - Get/update team
- `GET/POST /api/teams/[teamId]/players` - List/create players
- `POST /api/players/bulk` - Bulk create players
- `GET/POST /api/products` - List/create products
- `GET/PATCH/DELETE /api/products/[id]` - Product CRUD
- `GET/POST /api/orders` - List/create orders
- `POST /api/webhooks/stripe` - Stripe webhooks
