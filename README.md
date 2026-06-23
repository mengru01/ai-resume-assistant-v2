# AI Resume Rewrite & Job Application Assistant

A production-ready single-page SaaS app that helps users improve interview chances by rewriting resumes, matching job opportunities, and providing apply links after Stripe payment.

## Product Positioning

This product is not a resume analysis tool. It is an execution system:

```text
rewrite + match + apply
```

Free Tier is awareness only. Paid Tier is execution.

## Free vs Pro Rules

Free users can only see:

- Resume Risk Score, 0-100
- Risk level: `HIGH`, `MEDIUM`, or `LOW`
- 1-2 vague problems
- One warning line: `You are likely missing interview opportunities`

Free users must not see:

- Resume rewrite content
- ATS keyword lists
- Job matches
- Apply links
- Detailed career recommendations
- Instructions that explain exactly how to fix the resume

Pro users unlock:

- Full resume rewrite
- ATS optimized version
- Target-role version
- Full problem analysis
- ATS keyword gap analysis
- Weak impact rewrite guidance
- Hidden recruiter red flags
- Career directions
- Job matches with apply links
- Career direction advice
- Resume positioning strategy

## Features

- Professional blue SaaS UI
- Header, Hero, Resume Input, Target Role, Results, Paywall
- Hero title: `Why your resume is not getting interviews`
- Short buttons: `Rewrite`, `Analyze`, `Upgrade`, `Apply now`, `View job`
- Stripe Checkout payment gate
- Prisma persistence for users, usage, Pro unlocks, and generated results
- Vercel-ready App Router structure

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- API Routes
- Prisma
- PostgreSQL, recommended via Vercel Postgres, Neon, or Supabase
- Stripe Checkout
- OpenAI-compatible Chat Completions API

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Required Environment Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
COOKIE_SECRET=replace-with-a-long-random-string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"

OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRICE_ID=price_your_pro_access_price
```

`OPENAI_BASE_URL` can point to any OpenAI-compatible provider that supports `/chat/completions` and JSON object output.

## Stripe Setup

1. Create a Stripe product named `AI Resume Assistant Pro`.
2. Create a `$5 one-time payment` price.
3. Copy the price ID into `STRIPE_PRICE_ID`.
4. Add a webhook endpoint:

```text
https://your-domain.com/api/stripe/webhook
```

5. Subscribe to these events:

```text
checkout.session.completed
payment_intent.succeeded
```

6. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

The client never grants itself Pro access. Pro is unlocked only after a verified Stripe webhook writes `hasProAccess: true`.

## Vercel Deployment

1. Push this project to a Git provider.
2. Create a Vercel project from the repository.
3. Add a Postgres database, such as Vercel Postgres, Neon, or Supabase Postgres.
4. Set all environment variables in Vercel.
5. Push the Prisma schema once:

```bash
npx prisma db push
```

6. Deploy.
7. Update `NEXT_PUBLIC_APP_URL` to the production URL.
8. Configure the production Stripe webhook URL.

## API Contract

`POST /api/analyze`

Input:

```json
{
  "resume_text": "Full resume text...",
  "target_job": "Product Manager"
}
```

Free output:

```json
{
  "score": 42,
  "risk_level": "HIGH",
  "vague_problems": [
    "Your resume may not pass ATS screening",
    "Your impact is not clearly demonstrated"
  ],
  "interview_warning": "You are likely missing interview opportunities",
  "gated": true
}
```

Pro output:

```json
{
  "score": 42,
  "risk_level": "HIGH",
  "vague_problems": [],
  "interview_warning": "",
  "rewritten_resume": "",
  "ats_version": "",
  "target_role_version": "",
  "full_problem_analysis": [],
  "positioning_strategy": "",
  "career_direction_advice": "",
  "job_fits": [
    {
      "career": "",
      "reason": ""
    }
  ],
  "job_matches": [
    {
      "job_title": "",
      "company": "",
      "location": "",
      "reason": "",
      "apply_link": ""
    }
  ]
}
```

## Production Notes

- `Rewrite`, `Unlock`, `Fix my resume`, and `Get full report` should trigger Stripe for non-Pro users.
- `Analyze` can return the free awareness result.
- Anonymous users are tracked with a signed HTTP-only cookie.
- Free usage limits are enforced server-side via the database.
- Pro unlocks full execution for the same browser identity.
- For cross-device accounts, add email auth with Clerk, NextAuth, or Supabase Auth.
- Keep `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `OPENAI_API_KEY` server-only.
