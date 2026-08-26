# Drive Offer — Backend (Phase 1: Infrastructure)

Telecom offer purchasing platform backend for the Bangladeshi market.
Node.js + TypeScript + Express + MongoDB/Mongoose.

## What's in this phase

- `src/config` — env validation (Zod), logger (Pino, with secret redaction), MongoDB connection
- `src/integrations/storage` — **Cloudinary** (free tier) for NID/profile images: private "authenticated" delivery + signed URLs for NID, public URLs for profile photos. Swappable behind a `StorageProvider` interface.
- `src/middleware` — requestId, auth (customer), admin, payment-device, validation (Zod), rate limiting, error handling, image upload (Multer, memory storage, 5MB/2-file limit, JPEG/PNG/WEBP only)
- `src/shared` — error classes + error codes, API response envelope, pagination, money (integer poisha), ID generator, actor types
- `src/app.ts` / `src/server.ts` — Express bootstrap, security headers (Helmet), CORS whitelist, graceful shutdown
- `src/modules/*` — empty module folders, one per collection, ready for Phase 2+
- `src/routes/v1.ts` — versioned router; module routers get mounted here as they're built

## Setup

```bash
cp .env.example .env    # fill in real secrets before running
npm install
npm run dev              # tsx watch mode
npm run build && npm start   # production build
npm run typecheck
```

Cloudinary: create a free account at cloudinary.com, grab Cloud Name / API
Key / API Secret from the dashboard, put them in `.env`. No credit card
needed on the free tier.

Requires MongoDB running as a **replica set** (Atlas gives you this by
default) — financial operations use multi-document transactions.

## Design decisions carried through from the spec

- Controllers stay thin; business logic lives in services; DB access lives in repositories (not yet created — Phase 2+).
- Every monetary value is an integer (poisha), never a float.
- `req.actor` (not request body) is the only trusted source of identity — customer/admin/device.
- Refresh tokens are opaque + hashed at rest; access tokens are short-lived JWTs.
- All errors flow through one `AppError` hierarchy → one error middleware → one JSON envelope.

## Roadmap (matches spec section 131)

- [x] Phase 1 — Infrastructure
- [ ] Phase 2 — Auth (registration, email OTP, login, sessions, trusted devices)
- [ ] Phase 3 — Users (profile, NID identity, customer-created customers)
- [ ] Phase 4 — Operators
- [ ] Phase 5 — Offers & Drive Offers
- [ ] Phase 6 — Wallet & wallet transactions
- [ ] Phase 7 — Payment Listener (pairing, heartbeat, SMS events, parsers, verification)
- [ ] Phase 8 — Orders (wallet purchase, state machine, admin processing, manual orders)
- [ ] Phase 9 — Refunds
- [ ] Phase 10 — Notifications
- [ ] Phase 11 — Admin dashboard
- [ ] Phase 12 — Hardening (security tests, load tests, deployment)
