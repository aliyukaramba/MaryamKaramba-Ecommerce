# WhatsApp Commerce Platform

A production-ready commerce platform where customers browse a catalog and complete every order **in a WhatsApp chat** — there is no cart, no online payment, and no checkout page. A customer picks a product, fills a short inquiry form, and is redirected to WhatsApp with a pre-filled message containing every order detail, ready to send.

---

## 1. Overview

- **Storefront**: browse by category, filter/sort, view product detail pages, and order via the "Buy on WhatsApp" flow.
- **Order flow**: the inquiry form saves the customer + order to Postgres *before* opening WhatsApp, so nothing is lost even if the customer never sends the message.
- **Admin dashboard**: products, variants, inventory, categories, inquiries (with status pipeline), customers, newsletter subscribers, homepage/business settings, and admin user management — all role-gated (`SUPER_ADMIN` / `ADMIN` / `STAFF`).
- **No payment processor integration** — payment is arranged directly between the business and customer over WhatsApp, by design.

## 2. Architecture

```
Browser ──▶ Next.js App Router (Vercel Edge/Node runtime)
              ├─ Server Components — read-heavy pages (product pages, admin lists)
              ├─ Server Actions    — all writes (create inquiry, product CRUD, etc.)
              ├─ Route Handlers    — Auth.js, Cloudinary signing, CSV/Excel export
              └─ Middleware        — guards /admin/* routes by session + role
                       │
                       ▼
              Prisma ORM ──▶ PostgreSQL
                       │
                       ▼
              Cloudinary (image storage, signed uploads)
```

Key design decisions:
- **Server-side re-pricing**: the inquiry action never trusts a client-submitted price — it re-reads price/variant/stock from the database inside the transaction, so a stale page or tampered request can't create an inquiry at the wrong price.
- **Soft-delete on order history**: products or variants that have ever appeared in an inquiry are archived/deactivated rather than deleted, so past orders always resolve correctly.
- **Everything's a transaction**: customer + inquiry + inquiry items are created atomically; stock adjustments write an `Inventory` ledger row in the same transaction as the stock change.

## 3. Folder structure

```
prisma/
  schema.prisma          # 13 models + Auth.js models
  seed.ts                # admin user, settings, categories, sample products
src/
  actions/                # Server Actions — all mutations, all auth-guarded
  app/
    (storefront)/          # public site — layout has header/footer
      shop/ product/[slug]/ category/ about/ contact/ faq/
    admin/
      (auth)/login/         # public — middleware allows this path through
      (dashboard)/          # everything else — middleware requires a session
    api/                    # Auth.js, Cloudinary signing, CSV/Excel export
    layout.tsx sitemap.ts robots.ts manifest.ts
  components/
    admin/                  # dashboard-only components
    storefront/             # public-site components
    ui/                     # shadcn-style primitives (hand-written, no CLI)
  lib/                      # prisma client, auth, whatsapp message builder,
                             # rate limiting, sanitization, validations
  middleware.ts
```

## 4. Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Auth.js v5 · Cloudinary · React Hook Form + Zod · Framer Motion · Recharts · exceljs / papaparse (exports)

## 5. Installation

```bash
git clone <your-repo-url>
cd whatsapp-commerce
npm install
```

`npm install` runs `prisma generate` automatically via `postinstall`. If that step fails because of a restricted network, run it manually once you have normal internet access:

```bash
npx prisma generate
```

## 6. Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` locally |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✅ | from your Cloudinary dashboard |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | same cloud name, exposed client-side |
| `WHATSAPP_NUMBER` / `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✅ | international format, digits only, e.g. `2348012345678` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | full production URL, no trailing slash |
| `RESEND_API_KEY` / `EMAIL_FROM` / `ADMIN_NOTIFICATION_EMAIL` | optional | leave blank to disable email notifications |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | recommended for production | rate limiting; without it, rate limiting falls back to in-memory, which does **not** work correctly across multiple serverless instances |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | seed only | used once by `prisma/seed.ts`; **change this password immediately after first login** |

## 7. Database setup

```bash
# Create the database (adjust for your Postgres provider)
createdb whatsapp_commerce

# Apply the schema
npx prisma migrate dev --name init

# Seed sample data (admin user, categories, 3 demo products, business settings)
npm run db:seed
```

For production, use `npx prisma migrate deploy` instead of `migrate dev` — see the deployment guide below.

## 8. Cloudinary configuration

1. Create a free account at cloudinary.com.
2. Copy your Cloud Name, API Key, and API Secret into `.env`.
3. No upload preset is required — the app uses **signed uploads** (`/api/cloudinary/sign`), so the API secret never leaves the server.

## 9. Authentication setup

Auth.js v5 with a Credentials provider (email + password, bcrypt-hashed). Default admin credentials come from the seed script:

```
Email:    admin@example.com
Password: Admin123!
```

**Change this password on first login** — go to Admin Users (Super Admin only) and create a personal account, then deactivate or change the default one.

## 10. Running locally

```bash
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin/login

## 11. Deploying to Vercel

See `DEPLOYMENT.md` for the full step-by-step guide.

## 12. Troubleshooting

| Problem | Likely cause |
|---|---|
| `prisma generate` fails during install | Restricted/offline network — rerun `npx prisma generate` once you have normal internet access |
| Login always fails | `AUTH_SECRET` not set, or seed script never ran |
| Images won't upload | Check all three `CLOUDINARY_*` server variables are set; the sign route returns 401 if you're not logged in as an admin |
| WhatsApp link opens with no text | `WHATSAPP_NUMBER` missing/malformed — must be digits only, country code first, no `+` or leading `0` |
| Rate limit errors under normal use | If running multiple serverless instances without Upstash configured, the in-memory rate limiter isn't shared across instances — add Upstash Redis |
| Inquiry submits but stock doesn't update | Stock is only decremented by explicit admin action in Inventory (by design — the business confirms availability over WhatsApp before committing stock) |

## 13. Maintenance

- **Backups**: enable automatic backups on your Postgres provider (Neon, Supabase, RDS, etc.) — this database is the system of record for every order.
- **Activity log**: every admin mutation writes an `ActivityLog` row; useful for auditing who changed what.
- **Dependency updates**: this project pins exact versions for Next.js and its ESLint config due to a critical RCE (CVE-2025-66478) and follow-up CVEs affecting earlier 15.x releases — check the Next.js security advisories before bumping major/minor versions.
