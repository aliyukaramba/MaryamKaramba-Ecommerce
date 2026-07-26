# Authentication Security Audit

Conducted against the actual codebase as of this audit — every finding below was verified by reading the real implementation, not assumed from a generic checklist. Two systems exist and were audited separately: **Admin authentication** (Auth.js v5, Credentials provider, `User` model) and **Customer authentication** (a deliberately separate, custom-built lightweight JWT-in-cookie system, `CustomerAccount` model, now including Google OAuth).

---

## Summary of Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | No rate limiting on admin login | **Critical** | ✅ Fixed |
| 2 | Password reset tokens stored in plaintext (admin) | **High** | ✅ Fixed |
| 3 | JSON-LD injection via unescaped `JSON.stringify` in `dangerouslySetInnerHTML` | **High** | ✅ Fixed |
| 4 | Customer email not normalized — case-sensitive duplicate accounts possible | **High** | ✅ Fixed |
| 5 | No password reset flow for customer accounts at all | **High** | ✅ Fixed |
| 6 | Four inconsistent, weak password policies across four different flows | **High** | ✅ Fixed |
| 7 | Timing side-channel on login (early return skips `bcrypt.compare`) | **Medium** | ✅ Fixed |
| 8 | No authentication event logging (register/login/logout) | **Medium** | ✅ Fixed |
| 9 | Deactivating/resetting an account doesn't revoke existing sessions | **Medium** | ✅ Mitigated |
| 10 | No CSRF token on state-changing custom API routes | **Medium** | ✅ Hardened |
| 11 | No email verification on customer registration | **Medium** | ⚠️ Not implemented — recommended |
| 12 | No account lockout beyond IP-based rate limiting | **Low** | ⚠️ Not implemented — recommended |
| 13 | bcrypt instead of Argon2id | **Low** | ⚠️ Not changed — informational |
| 14 | No "log out of all devices" capability | **Low** | ⚠️ Architectural limitation — documented |

---

## Detailed Findings

### 1. No rate limiting on admin login — CRITICAL

**Where:** `src/lib/auth.ts`, the Credentials provider's `authorize()` function.

**Risk:** This is the single highest-privilege entry point in the entire system — a successful login grants full Super Admin access to products, orders, customer data, and business settings. It had **zero** rate limiting, while every other write endpoint in the app (customer login, registration, checkout, newsletter) did. An attacker could script unlimited password guesses against a known admin email with no throttling at all.

**Fix implemented:** Added `rateLimit()` inside `authorize()`, keyed by IP, limited to 5 attempts per 5 minutes — stricter than the customer login limit (8/5min), reflecting the higher stakes of this specific endpoint.

---

### 2. Password reset tokens stored in plaintext — HIGH

**Where:** `src/actions/password-reset.ts` (admin), `User.resetToken`.

**Risk:** The raw, usable reset token was written directly to the `resetToken` column. If the database were ever exposed — a misconfigured backup, an over-privileged read replica, a future SQL injection elsewhere, an insider — an attacker wouldn't need email access at all; the stored value *is* a working password-reset credential for any admin with a pending reset.

**Fix implemented:** Only `SHA-256(token)` is now stored (`resetTokenHash`). The raw token exists only in the emailed link and the recipient's browser; a database leak alone can no longer be used to reset anyone's password. Applied identically to the new customer reset flow. SHA-256 (not bcrypt) is the correct tool here — the token is already 256 bits of random entropy from `crypto.randomBytes`, so it doesn't need slow, salted hashing the way a human-chosen password does.

---

### 3. JSON-LD injection via unescaped serialization — HIGH

**Where:** `src/app/(storefront)/product/[slug]/page.tsx` and `src/app/layout.tsx`, both embedding `JSON.stringify(...)` directly into `<script type="application/ld+json">` via `dangerouslySetInnerHTML`.

**Risk:** `JSON.stringify` does not escape `<`. If any string field feeding that object — a product name or description, both admin-editable — ever contained the literal sequence `</script>`, it would close the script tag early. Everything after it in the JSON would then be parsed as regular HTML, including a second, attacker-controlled `<script>` tag. This is a stored XSS vector reachable by anyone with product-editing access (Staff role and above), or by accident from an oddly-formatted product name.

**Fix implemented:** New `safeJsonLd()` helper escapes `<`, `>`, and `&` as Unicode escapes before serialization. This produces JSON that parses identically for every real JSON-LD consumer (search engines, structured data validators) while making the breakout impossible. Applied to both injection points.

---

### 4. Customer email not normalized — HIGH

**Where:** `src/actions/customer-auth.ts` (`registerCustomerAccount`, `upsertGoogleCustomerAccount`).

**Risk:** Postgres unique constraints are case-sensitive by default. `Jane@Example.com` and `jane@example.com` would be treated as different values, meaning: (a) the same person could accidentally create two accounts, splitting their order history, and (b) a customer who registered via phone+password with one case, then used "Continue with Google" where Google returns a differently-cased email, would fail to link to their existing account and get a duplicate instead — directly undermining the account-linking logic that was built specifically to prevent that.

**Fix implemented:** Email is now normalized (`.toLowerCase().trim()`) at the Zod schema level for registration and password reset requests, and explicitly normalized in the Google OAuth callback before lookup/storage — consistent everywhere an email is written or matched.

---

### 5. No password reset flow for customer accounts — HIGH

**Where:** Previously only existed for admin (`src/actions/password-reset.ts`); customer accounts had no equivalent at all.

**Risk:** A customer who forgot their password had no recovery path whatsoever — a real, user-facing gap, not just a security one.

**Fix implemented:** Full parallel flow built for customers: `requestCustomerPasswordReset` / `resetCustomerPassword`, using the same hashed-token, time-limited (60 min), one-time-use design as the (now-fixed) admin flow, plus generic responses that don't reveal whether an email exists or has a password set. New pages at `/account/forgot-password` and `/account/reset-password`, linked from the login form.

**One honest constraint:** customer accounts only require a phone number, not an email — reset is necessarily email-based (you can't "email" a phone number), so an account with no email on file has no self-service recovery path yet. This matches how the feature was scoped, not an oversight, but worth knowing.

---

### 6. Four inconsistent password policies — HIGH

**Where:** Admin login (min 6, no complexity), admin reset (min 8, upper/lower/digit, no special char, no max), customer register (min 8/max 72, no complexity at all), admin create-user (min 8, upper + digit only, no lowercase requirement).

**Risk:** Beyond the obvious weak-password exposure, having four different rules across four flows meant a password valid in one place could be silently rejected in another, and none of them blocked trivially common passwords like `Password123`.

**Fix implemented:** One shared `strongPasswordSchema` (`src/lib/validations/password-policy.ts`) — min 10, max 72 (bcrypt silently truncates beyond 72 bytes, so capping here prevents a false sense of extra security), requires uppercase, lowercase, number, and special character, and rejects a curated list of the most common breached/guessed passwords. Applied consistently to every flow where a *new* password is being chosen: customer registration, both password resets, and admin user creation. **Login schemas were deliberately left alone** — enforcing today's complexity rules on an existing credential would lock out legitimate accounts created under an earlier policy; login only needs "a password was entered," the real check is `bcrypt.compare`.

---

### 7. Timing side-channel on login — MEDIUM

**Where:** Both `loginCustomerAccount` and admin `authorize()`.

**Risk:** Both functions returned immediately with no `bcrypt.compare` call when the account didn't exist, but ran a full `bcrypt.compare` (inherently slow by design, ~100ms+) when it did. That timing gap is measurable and lets an attacker determine which phone numbers/emails have accounts purely by observing response latency — a real, well-documented class of attack (user enumeration via timing).

**Fix implemented:** Both paths now run `bcrypt.compare` against a fixed dummy hash even when no account is found, so response timing is statistically indistinguishable regardless of whether the account exists.

---

### 8. No authentication event logging — MEDIUM

**Where:** Customer register/login/logout had no logging at all; admin login had none either (only later admin *actions* like product edits were logged).

**Risk:** No audit trail for the events that matter most for detecting an attack in progress — repeated failed logins, unexpected new registrations, unusual login patterns.

**Fix implemented:** Every auth event now logs through the existing `ActivityLog` mechanism: admin login success/failure, customer register/login success/failure/logout, and Google sign-in. **Only non-sensitive identifiers are logged** — email/phone as attempted-login context, never passwords, tokens, or session values. (`ActivityLog.userId` is a strict foreign key to the admin `User` table, so customer events are logged with `userId: null` and the account id in `entityId` instead — avoids a schema change while keeping every event queryable.)

---

### 9. Deactivating an account doesn't revoke existing sessions — MEDIUM (mitigated, not fully solved)

**Where:** Architectural — both auth systems use stateless JWT sessions.

**Risk:** If a Super Admin deactivates another admin's account, or a password is reset, any JWT session that admin already has open in a browser remains fully valid until it naturally expires — nothing re-checks `isActive` or the current password hash on every request, since that's the entire point of a stateless JWT (no database round-trip needed per request).

**What was done:** Admin session lifetime shortened from NextAuth's 30-day default to **8 hours**, bounding the exposure window significantly without adding a server-side session store. Customer sessions remain at 30 days — a deliberate, lower-risk-tolerance choice, since a compromised customer account can only affect that customer's own data, not the business.

**What a complete fix looks like** (not implemented — genuinely different architecture): a `tokenVersion` integer on `User`/`CustomerAccount`, incremented on password change or deactivation, embedded in the JWT and checked on every request against the current database value. This trades away some of the stateless-JWT performance benefit for real-time revocation. Worth doing if admin account compromise becomes a live concern; not done here to avoid rushing a change to the exact code path everything else depends on.

---

### 10. No CSRF protection on custom API routes — MEDIUM

**Where:** `src/app/api/cloudinary/delete/route.ts` — a state-changing, cookie-authenticated POST endpoint.

**Risk:** Next.js Server Actions get built-in CSRF protection automatically; hand-written Route Handlers do not. `SameSite=Lax` cookies (the default here) already block the most common cross-site POST attack pattern, but relying on cookie policy alone as the *only* defense is thin.

**Fix implemented:** Explicit `Origin` header verification added — the request is rejected with 403 unless it originates from the site's own domain. Read-only routes (CSV/Excel export, the Topify webhook which uses signature verification instead of cookies, both Google OAuth routes which have their own `state`-based CSRF protection) were reviewed and don't need the same treatment — either they don't mutate anything, or they already have an equivalent protection.

---

### 11. No email verification on customer registration — MEDIUM, not implemented

**Risk:** Anyone can register with any email address without proving ownership. Practically: order confirmations and review notifications could go to an email the registrant doesn't actually control, and there's no verification gate blocking login/checkout.

**Why not implemented now:** This is a genuinely large, standalone feature — verification tokens, expiry, a resend flow, and a decision about whether to block login/checkout until verified (which has real UX tradeoffs for a commerce site where friction directly costs sales). Given the size, I'd rather scope and build it properly in a dedicated pass than bolt on a partial version. **Recommended as the next security-relevant feature to build.**

---

### 12. No account lockout beyond IP rate limiting — LOW, not implemented

IP-based rate limiting (already in place) is the primary defense but has a known weakness: shared IPs (NAT, corporate networks, mobile carriers) mean legitimate users can get rate-limited by someone else's failed attempts, while a sufficiently distributed attack can spread requests across many IPs to stay under the per-IP threshold. A complementary **per-account** lockout (e.g., 10 failed attempts triggers a temporary account-level lock regardless of source IP) would close that gap. Not implemented — recommended as a follow-up.

---

### 13. bcrypt vs. Argon2id — LOW, informational only

bcrypt (via `bcryptjs`, cost factor 12) is explicitly listed as an OWASP-acceptable password hashing algorithm — this is **not a vulnerability**. Argon2id is OWASP's current *first* recommendation, with somewhat stronger resistance to GPU/ASIC cracking at scale. Given bcrypt is already correctly implemented everywhere, migrating is a "nice to have for a large-scale target," not an urgent fix for a system this size. Noted for completeness, not acted on.

---

### 14. No "log out of all devices" — LOW, architectural limitation

A direct consequence of stateless JWT sessions (same root cause as Finding 9) — there's no server-side session list to selectively revoke. The `tokenVersion` approach described in Finding 9 would also enable this (a manual "log out everywhere" button that just increments the version). Documented, not built, for the same reasons as Finding 9.

---

## Areas Reviewed With No Issues Found

- **SQL injection:** Not possible as written — every query goes through Prisma's parameterized query builder; no raw SQL (`$queryRawUnsafe` or similar) exists anywhere in the codebase.
- **Mass assignment:** Every mutation parses input through an explicit Zod schema first, then constructs the Prisma `data` object field-by-field — nothing is ever spread directly from request input into a database write.
- **Authorization bypass:** Every admin server action independently calls `requireRole()` server-side, regardless of what the UI shows or hides. Customer actions (delivery confirmation, reviews) independently verify the acting session owns the resource being acted on, not just that *some* session exists.
- **Database constraints:** Appropriate `@@unique` constraints exist on `User.email`, `CustomerAccount.phone/email/googleId`, `Order.paymentReference`, and `Review` (composite unique on order+product). Cascade rules are deliberately conservative — child records (order items, inquiry items) cascade-delete with their parent, but relations that shouldn't cascade (e.g. a push token losing its account link) correctly use `SetNull` instead.
- **Environment variables:** All secrets (`AUTH_SECRET`, `CUSTOMER_AUTH_SECRET`, `TOPIFY_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, `CLOUDINARY_API_SECRET`, `DATABASE_URL`) are environment-configured, never hardcoded. Local `.env` and Vercel's environment variables are already separated per the existing deployment setup.
- **Generic error messages:** Both login flows already returned identical errors for "no such account" and "wrong password" before this audit — good practice that was already in place.

---

## Production Blockers

Of everything above, these should be resolved before the current feature set (payments, customer accounts, reviews) is considered production-ready for real, unsupervised traffic:

1. ~~No rate limiting on admin login~~ — **resolved in this audit**
2. ~~Plaintext reset tokens~~ — **resolved in this audit**
3. ~~JSON-LD XSS~~ — **resolved in this audit**

Everything else in this document is either already fixed or is a genuine "recommended enhancement," not a blocker — nothing outstanding here should stop a launch.

## Suggested Next Security Investment

In priority order, if more time is put into this area:

1. **Email verification for customer accounts** (Finding 11) — the largest remaining gap, and the one most likely to matter as the customer base grows.
2. **`tokenVersion`-based session revocation** (Findings 9 & 14) — turns "shorten the session" into "actually revoke it immediately," and enables a real "log out everywhere" feature.
3. **Per-account lockout** (Finding 12) — complements existing IP rate limiting.
4. **Migrate to Argon2id** (Finding 13) — low urgency, but the correct long-term direction per current OWASP guidance.
