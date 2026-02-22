# Vercel Production Deployment Guide

## 1. Required Environment Variables (Vercel Settings)

Add these to **Settings > Environment Variables** in Vercel Dashboard:

### Database

- `DATABASE_URL` — PostgreSQL connection string (use session pooler for web)
- `DIRECT_URL` — Direct PostgreSQL URL (for migrations, use connection pooler)

### Supabase (Auth + Storage)

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key (public)
- `SUPABASE_URL` — Project URL for server-side operations (secret)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for admin operations (secret)

### reCAPTCHA (Form Protection)

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — Site key (public)
- `RECAPTCHA_SECRET_KEY` — Secret key (secret)

### Rate Limiting (Upstash Redis)

- `UPSTASH_REDIS_REST_URL` — Redis REST API endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Redis REST API token

**Note:** Secrets should NOT be prefixed with `NEXT_PUBLIC_`. Vercel automatically protects them.

---

## 2. Prisma Production Workflow

### Pre-Deployment

1. Test migrations locally:

   ```bash
   npm run build
   ```

2. Generate migration (if schema changed):
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```

### During Deployment

Vercel runs `npm run build` automatically, which includes:

- Next.js compilation
- Prisma Client generation (`postinstall` hook)
- Static page pre-rendering

### Post-Deployment (First Time or After Schema Changes)

Run migrations on production database:

```bash
npx prisma migrate deploy --skip-generate
```

**Or via Vercel CLI:**

```bash
vercel env pull  # Get prod env vars locally
npx prisma migrate deploy
```

**Important:**

- Use `DIRECT_URL` (not pooled connection) for migrations
- Verify database is accessible before deploying
- Keep `prisma.config.ts` or package.json `prisma` field for seed config

---

## 3. Post-Deployment Smoke Test Checklist

### Critical Routes (5 min)

- [ ] Home page loads: `https://yourdomain.com/en`
- [ ] Services page loads (no errors): `https://yourdomain.com/en/services`
- [ ] Services with filters work: `?q=test&page=1`
- [ ] Public API responds: `GET /api/services` (200, pagination metadata)
- [ ] Form submission works: POST `/api/provider-requests` (or similar)

### Auth & Admin

- [ ] Login page accessible: `/en/login`
- [ ] Admin panel accessible (if authenticated): `/en/admin` (403 if not logged in)
- [ ] Dashboard page: `/en/dashboard` (redirect to login if not authenticated)

### SEO & Robots

- [ ] Sitemap accessible: `/sitemap.xml` (lists pages)
- [ ] Robots.txt exists: `/robots.txt` (allows crawling)
- [ ] Canonical tags present on `/en/services?page=2` (pagination SEO)
- [ ] Prev/Next links in head: `<link rel="prev">`, `<link rel="next">`

### Database Connectivity

- [ ] Services list displays data (DB query works)
- [ ] Pagination works: `/services?page=2` returns correct subset
- [ ] Filters work: `/services?city=oslo` filters results

### Third-Party Services

- [ ] reCAPTCHA script loads on forms (no console errors)
- [ ] Rate limiting works (test `/api/services` with 150+ rapid requests → 429)
- [ ] Supabase auth initialized (no console errors about missing keys)

---

## 4. Quick Troubleshooting

| Issue                     | Cause                          | Fix                               |
| ------------------------- | ------------------------------ | --------------------------------- |
| 500 on `/api/services`    | Missing `DATABASE_URL`         | Add var to Vercel, redeploy       |
| Form submission fails     | Missing `RECAPTCHA_SECRET_KEY` | Verify secret is set (not public) |
| Rate limiting not working | `UPSTASH_REDIS_*` missing      | Add Redis credentials to Vercel   |
| Supabase auth crash       | Wrong `SUPABASE_URL`/key       | Check keys in Supabase dashboard  |
| Pages not indexed         | Missing canonical/robots       | Verify SEO hints in page source   |

---

## 5. Rollback Plan

If deployment fails:

1. Check Vercel logs: **Deployments > [Failed] > Logs**
2. Verify all env vars are set: **Settings > Environment Variables**
3. Run locally with prod env to replicate: `vercel env pull && npm run build`
4. Rollback to previous deployment: **Deployments > [Stable] > Promote**

---

**Last Updated:** February 21, 2026
