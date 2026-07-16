# Deployment Guide — Zero to Production on Vercel

Follow these steps in order. Each one builds on the last.

## 1. Clone the project

```bash
git clone <your-repo-url>
cd whatsapp-commerce
```

## 2. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically. If it fails due to network restrictions in your environment, run `npx prisma generate` manually once you're on a normal connection — this does not affect Vercel's build, which has full network access.

## 3. Create a PostgreSQL database

Use any managed Postgres provider — **Neon**, **Supabase**, and **Vercel Postgres** all work well and have generous free tiers. Create a database and copy its connection string.

## 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in every value described in `README.md` §6. At minimum you need `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, the three `CLOUDINARY_*` server variables, and `WHATSAPP_NUMBER`.

Generate a secret:

```bash
openssl rand -base64 32
```

## 5. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

This creates every table defined in `prisma/schema.prisma` in your new database.

## 6. Seed the database

```bash
npm run db:seed
```

Creates the default admin user, business/homepage settings, 4 categories, and 3 sample products so the storefront isn't empty on first load.

## 7. Configure Cloudinary

Sign up at cloudinary.com, grab your Cloud Name / API Key / API Secret from the dashboard, and put them in `.env`. No further setup needed — the app signs its own uploads server-side.

## 8. Configure Auth.js

Already done via `AUTH_SECRET` and `NEXTAUTH_URL` in step 4. In production, `NEXTAUTH_URL` must exactly match your live domain (e.g. `https://yourdomain.com`, no trailing slash).

## 9. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

## 10. Import into Vercel

1. Go to vercel.com → **Add New Project**.
2. Import your GitHub repository.
3. Framework preset should auto-detect as **Next.js** — leave build/output settings as default.

## 11. Configure Vercel environment variables

In the Vercel project → **Settings → Environment Variables**, add every variable from your `.env` file. Use your **production** database URL and **production** domain for `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` — do not reuse `localhost` values.

If your Postgres provider requires SSL (most managed providers do), make sure `DATABASE_URL` includes `?sslmode=require`.

## 12. Deploy

Click **Deploy**. Vercel will run `npm install` (which runs `prisma generate`) and then `npm run build` (which also runs `prisma generate` again, harmlessly).

If this is the first deploy against a fresh production database, run migrations against it before or right after deploy:

```bash
DATABASE_URL="<your-production-url>" npx prisma migrate deploy
DATABASE_URL="<your-production-url>" npm run db:seed
```

## 13. Test login

Visit `https://yourdomain.com/admin/login` and sign in with the seeded admin credentials (`admin@example.com` / `Admin123!` unless you changed them in `.env` before seeding). **Change this password immediately** by creating a new Super Admin user and deactivating the default one.

## 14. Test product creation

In the admin dashboard, go to **Products → Add Product**, fill in the required fields (name, SKU, category, price, at least one image), and publish it. Confirm it appears on `/shop`.

## 15. Test image uploads

While creating/editing a product, drag an image into the uploader. If it fails, double-check the three `CLOUDINARY_*` server variables are set correctly in Vercel's environment variables (not just locally).

## 16. Test inquiry creation

On the storefront, open a published product, click **Buy on WhatsApp**, fill in the form, and submit. Confirm:
- A toast confirms the order was saved.
- WhatsApp opens (or a new tab attempts to) with the pre-filled message.
- The order appears in **Admin → Inquiries** with status `NEW`.

## 17. Test WhatsApp redirection

Confirm the pre-filled WhatsApp message contains the correct inquiry number, customer details, product, variant, quantity, price, and total — matching the format in the project spec.

## 18. Verify production build

Run a local production build before trusting any deploy long-term:

```bash
npm run build
npm run start
```

Check for build warnings, broken links, and confirm `/sitemap.xml`, `/robots.txt`, and `/manifest.webmanifest` all resolve correctly on your live domain.

---

## Post-launch checklist

- [ ] Changed the default admin password
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real production domain (affects sitemap, canonical URLs, and the WhatsApp message's product links)
- [ ] Added Upstash Redis env vars (rate limiting doesn't work correctly across serverless instances without it)
- [ ] Uploaded a real logo/favicon via Business Settings
- [ ] Replaced sample products and categories with real catalog data
- [ ] Verified the WhatsApp number receives messages correctly from a real device
- [ ] Set up database backups with your Postgres provider
