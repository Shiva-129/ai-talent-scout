# 🧠 TalentScout — AI-Powered Candidate Sourcing & Engagement

> Imagine having a tireless recruiting assistant that reads a job description, finds the best candidates, scores them across five dimensions, holds a simulated phone screening with each one, and hands you a ranked shortlist — all in under two minutes. That's TalentScout.

---

## Getting Started

Don't worry — setting this up is simpler than it looks. You just need Node.js installed on your machine and a free Gemini API key. That's it. No databases, no cloud accounts, no complicated config.

### Step 1 — Make sure you have Node.js

Open your terminal and run:

```bash
node --version
```

If you see a version number like `v18.x` or higher, you're good. If not, download it from [nodejs.org](https://nodejs.org) — grab the LTS version.

### Step 2 — Clone or download the project

If you have Git installed:

```bash
git clone https://github.com/your-username/talent-scout.git
cd talent-scout
```

Or just download the ZIP from GitHub, unzip it, and open the folder in your terminal.

### Step 3 — Install dependencies

This pulls in everything the project needs (Next.js, React, the Gemini SDK, etc.):

```bash
npm install
```

Grab a coffee — this takes about 30 seconds the first time.

### Step 4 — Add your Gemini API key

There's a file called `.env.local` in the root of the project. Open it and you'll see:

```
GEMINI_API_KEY="your-key-here"
```

Replace `your-key-here` with your actual key from [Google AI Studio](https://aistudio.google.com/app/apikey). It's free to get one — just sign in with your Google account.

Your key should look something like this:

```
GEMINI_API_KEY="AIzaSy..."
```

> 🔒 This file is already in `.gitignore` — it will never be committed to git. Your key stays on your machine.

### Step 5 — Start the app

```bash
npm run dev
```

Then open your browser and go to **[http://localhost:3000](http://localhost:3000)**.

You should see the TalentAI landing page. Click "Start Scouting" and you're off.

---

> 💡 **That's genuinely all there is to it.** No environment variables beyond the API key, no database setup, no Docker, no deployment required. Everything runs locally on your machine.

---

## What is this, really?

TalentScout is a **full-stack AI recruiting pipeline** built with Next.js and powered by Google's Gemini 2.0 Flash model. It takes the most time-consuming parts of early-stage recruiting — parsing job descriptions, sifting through profiles, scoring fit, and gauging interest — and automates all of them end-to-end.

It's not a job board. It's not an ATS. It's the layer that sits *before* those tools — the part where a recruiter spends hours reading resumes and making cold calls — compressed into a single, visual, five-step pipeline.

---

## ⚙️ Before You Run It — Set Up Your API Key

TalentScout talks to Google Gemini under the hood. You need to give it your API key before anything works.

**Step 1 — Copy the environment file**

There's a file called `.env.local` in the root of the project. Open it and you'll see:

```
GEMINI_API_KEY="your-key-here"
```

**Step 2 — Paste your Gemini API key**

Replace `your-key-here` with your actual key from [Google AI Studio](https://aistudio.google.com/app/apikey). It should look like this:

```
GEMINI_API_KEY="AIzaSy..."
```

> 🔒 This file is already in `.gitignore` — it will never be committed to git. Your key stays on your machine.

> ⚠️ The free tier of Gemini has rate limits. TalentScout is tuned to work with 10 candidates per run to stay well within those limits. If you hit a rate limit, the app will show a live countdown and resume automatically.

---

## How the Pipeline Works

TalentScout is built around a **linear 5-stage pipeline**. Each stage feeds into the next, and your progress is saved in `localStorage` so you can close the tab and come back without losing anything.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        TALENTSCOUT PIPELINE                                    │
│                                                                                │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │          │    │          │    │          │    │          │    │          │ │
│   │ 1. Paste │───▶│2. Browse │───▶│ 3. Score │───▶│  4. Chat │───▶│5. Export││
│   │   the JD │    │ Matches  │    │ with AI  │    │ with AI  │    │Shortlist │ │
│   │          │    │          │    │          │    │          │    │          │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### Stage 1 — JD Input 📄

You paste a job description — it can be rough, copy-pasted from Notion, a LinkedIn post, whatever. The AI reads it and extracts:

```
Raw JD Text
    │
    ▼
┌─────────────────────────────────────┐
│         Gemini 2.0 Flash            │
│                                     │
│  Extracts:                          │
│  ├── Job Title                      │
│  ├── Skills (mandatory / preferred  │
│  │         / nice-to-have)          │
│  ├── Minimum Experience (years)     │
│  ├── Education requirement          │
│  ├── Location & work style          │
│  ├── Salary range                   │
│  └── Industry                       │
└─────────────────────────────────────┘
    │
    ▼
Structured ParsedJD object
saved to localStorage
```

The parsed result is shown as a clean card layout so you can verify everything was extracted correctly before moving on.

---

### Stage 2 — Candidate Discovery 🔍

No API call here — this stage runs entirely in the browser. It takes the parsed JD and scores all 10 candidates locally using a weighted formula:

```
For each candidate:

  Skill Match %  ──────────────────────────────── × 0.60
  (mandatory skills worth 3pts, preferred 2pts,
   nice-to-have 1pt — normalized to 0-100)

  Experience Score (0-10) ─────────────────────── × 2.5
  (full marks if meets minimum,
   penalized for gap, slight penalty if overqualified)

  Location Score (0-10) ──────────────────────── × 1.5
  (remote JD + remote candidate = 10
   city match = 10, hybrid-friendly = 8,
   neutral = 5, mismatch = 4)

  ─────────────────────────────────────────────────────
  Final Discovery Score  =  max 100
```

You can filter by minimum score, location, and experience range. Select the candidates you want to take forward — typically your top 3–5.

---

### Stage 3 — AI Match Scoring 🎯

For each selected candidate, TalentScout sends their full profile + the JD to Gemini and asks it to evaluate across **5 dimensions**:

```
┌────────────────────────────────────────────────────────┐
│                  SCORING DIMENSIONS                    │
│                                                        │
│  Skills Match        ████████████████████  40% weight  │
│  Experience          █████████████         25% weight  │
│  Education           ████████              15% weight  │
│  Location            █████                 10% weight  │
│  Industry Alignment  █████                 10% weight  │
│                                                        │
│  Each scored 0–100 by Gemini with a written rationale  │
│  Weighted total becomes the candidate's Match Score    │
└────────────────────────────────────────────────────────┘
```

Each card shows:
- A circular gauge with the total score (green ≥ 80, amber 60–79, red < 60)
- Expandable breakdown with per-dimension bars and rationale text
- Key strengths and gaps identified by the AI

---

### Stage 4 — Engagement Simulation 💬

This is the most interesting stage. For each candidate, Gemini plays **two roles simultaneously** — the recruiter and the candidate — and generates a realistic phone screening conversation.

```
┌──────────────────────────────────────────────────────────┐
│              CONVERSATION GENERATION                     │
│                                                          │
│  Gemini reads:                                           │
│  ├── Candidate's availability status                     │
│  │     "actively looking"  → enthusiastic, eager         │
│  │     "open to opps"      → curious, measured           │
│  │     "not looking"       → polite, sets high bar       │
│  │     "happy where I am"  → brief, dismissive           │
│  │                                                       │
│  ├── Their actual salary expectation vs JD range         │
│  ├── Their current company and role                      │
│  └── Their location vs job location                      │
│                                                          │
│  Generates 8–10 messages covering:                       │
│  1. Current role satisfaction                            │
│  2. Motivation for change                                │
│  3. Timeline to move                                     │
│  4. Salary discussion                                    │
│  5. Interest in this specific role                       │
└──────────────────────────────────────────────────────────┘
         │
         ▼
  Conversation transcript
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│              INTEREST SCORING                            │
│                                                          │
│  Gemini re-reads the transcript and scores:              │
│  ├── Interest Score  0–100                               │
│  ├── Interest Level  (very interested → not interested)  │
│  ├── Reasoning       2–3 sentence explanation            │
│  └── Red Flags       salary mismatch, vague answers etc  │
└──────────────────────────────────────────────────────────┘
```

---

### Stage 5 — Final Shortlist 🏆

The shortlist combines both scores into a single ranking:

```
Combined Score = (Match Score × Match Weight%)
               + (Interest Score × Interest Weight%)

Default weights: 60% match / 40% interest
You can drag the sliders to re-rank in real time.
```

```
EXAMPLE SHORTLIST OUTPUT:

  Rank  Candidate          Match  Interest  Combined
  ────  ─────────────────  ─────  ────────  ────────
  🥇 1  Jennifer Liu         88      91        89
  🥈 2  Alex Chen            95      78        88
  🥉 3  Hassan Ahmed         82      85        83
     4  Priya Sharma         76      72        74
     5  Emily Davis          61      88        72
```

You can download the full shortlist as a CSV (Excel-compatible, with UTF-8 BOM) with one click.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React / Next.js App Router              │   │
│  │                                                      │   │
│  │  PipelineContext (React Context)                     │   │
│  │  ├── parsedJD          ──┐                           │   │
│  │  ├── selectedCandidates  ├── synced to localStorage  │   │
│  │  └── completedStages   ──┘                           │   │
│  │                                                      │   │
│  │  Pages:  /jd-input → /candidates → /scoring          │   │
│  │          → /engagement → /shortlist                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │  fetch()                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              NEXT.JS API ROUTES (Server)                    │
│                                                             │
│   POST /api/parse-jd        → parses job description        │
│   POST /api/score-match     → scores one candidate          │
│   POST /api/score-interest  → scores conversation interest  │
│   POST /api/engage          → generates conversation        │
│                                                             │
│   All routes:                                               │
│   ├── Validate input (400 on bad data)                      │
│   ├── Check API key (500 if missing)                        │
│   ├── Detect rate limits → return 429 + retryAfter secs     │
│   └── Retry up to 3× on JSON parse failures                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                  GOOGLE GEMINI API                          │
│                                                             │
│   Model: gemini-2.0-flash                                   │
│   All prompts request JSON-only responses                   │
│   Markdown code fences stripped automatically               │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| AI Model | Google Gemini 2.0 Flash |
| AI SDK | `@google/genai` |
| Icons | Lucide React |
| State | React Context + localStorage |
| Deployment | Vercel-ready (static + serverless) |

---

## The Candidate Pool

TalentScout ships with 10 hand-picked candidate profiles designed to test both scenarios well:

| Candidate | Role | Skills Highlight | Availability |
|---|---|---|---|
| Alex Chen | Senior Backend Engineer | Python, Node.js, AWS | Open to opportunities |
| Priya Sharma | Full Stack Developer | Node.js, AWS, Remote | Actively looking |
| Jennifer Liu | Senior Backend Engineer | Python, Node.js, AWS | Actively looking |
| Hassan Ahmed | Backend Engineer | Python, Node.js, AWS | Actively looking |
| Marcus Johnson | Staff Engineer | Python, AWS (overqualified) | Not looking |
| Emily Davis | Junior Backend Dev | Python, Node.js (junior) | Actively looking |
| Chris Taylor | Product Designer | Figma, User Research, Design Systems | Happy where I am |
| Emma Watson | UX Researcher | User Research, Figma, Remote | Open to opportunities |
| David Kim | Frontend Engineer | Design Systems, Figma-adjacent | Happy where I am |
| Andrew Mitchell | Platform Engineer | TypeScript, Node.js, Remote | Open to opportunities |

The first six are optimized for **Scenario A** (Senior Backend Engineer). The last four are optimized for **Scenario B** (Product Designer). The mix of availability statuses ensures the engagement conversations feel genuinely different from candidate to candidate.

---

## Score Interpretation Guide

```
MATCH SCORE (from AI scoring stage)
  ┌─────────────────────────────────────────┐
  │  80 – 100  ●  Strong match              │
  │  60 –  79  ●  Partial match             │
  │   0 –  59  ●  Weak match                │
  └─────────────────────────────────────────┘

INTEREST SCORE (from engagement stage)
  ┌─────────────────────────────────────────┐
  │  85 – 100  Very interested              │
  │  65 –  84  Interested                   │
  │  45 –  64  Moderately interested        │
  │  25 –  44  Passive                      │
  │   0 –  24  Not interested               │
  └─────────────────────────────────────────┘

COMBINED SCORE (shortlist stage)
  Weighted blend of both — adjust sliders
  to prioritize fit vs. eagerness.
```

---

## Data Privacy

- No candidate data is ever stored on a server or database
- Everything lives in your browser's `localStorage`
- The only external call is to the Gemini API with the JD + candidate profile text
- Clearing your browser's local storage wipes all pipeline state
- The `.env.local` file with your API key never leaves your machine

---

## Known Limitations

- **Rate limits** — The free tier of Gemini allows a limited number of requests per minute and per day. TalentScout handles this gracefully with a countdown banner, but if you're running many pipelines back-to-back you may need to wait for the quota to reset (midnight Pacific time).
- **Simulated candidates** — The 10 candidate profiles are fictional. In a real deployment you'd replace `src/data/candidates.ts` with a live database or ATS integration.
- **Simulated conversations** — The engagement conversations are AI-generated, not real. They're designed to be realistic enough to give a meaningful interest signal, but they're not a substitute for actual outreach.

---

## Want to Connect a Real Database?

Right now TalentScout runs entirely off a static list of candidates baked into the code — which is perfect for demos and testing, but the moment you want to manage hundreds of real candidates without touching code, you'll want a proper database behind it.

We've written a step-by-step guide that walks you through the whole thing — from installing PostgreSQL and setting up Prisma, to seeding your database and wiring the candidates page to pull live data. No prior database experience needed, every step is explained in plain English.

👉 **Read [`DATABASE.md`](./DATABASE.md) to get started.**

---

*Built with Next.js, Tailwind CSS, and Google Gemini 2.0 Flash.*
