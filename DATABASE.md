# 🗄️ Connecting TalentScout to a Real Database

Right now, TalentScout's candidate pool lives in a single TypeScript file —
`src/data/candidates.ts`. That's perfectly fine for demos and testing, but the
moment you want to manage candidates without touching code, add new ones through
a UI, or share the app with a team, you need a real database behind it.

This guide walks you through connecting TalentScout to **PostgreSQL** using
**Prisma** as the ORM. No prior database experience assumed — every step is
explained from scratch.

---

## What We're Building

```
┌─────────────────────────────────────────────────────────┐
│                     BEFORE                              │
│                                                         │
│   candidates page  ──reads──▶  candidates.ts (static)   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      AFTER                              │
│                                                         │
│   candidates page  ──fetch──▶  /api/candidates         │
│                                      │                  │
│                                      ▼                  │
│                               Prisma ORM                │
│                                      │                  │
│                                      ▼                  │
│                            PostgreSQL Database          │
│                         (local or cloud — your choice)  │
└─────────────────────────────────────────────────────────┘
```

---

## What You'll Need

Before starting, make sure you have these installed on your machine:

- **Node.js** (you already have this — the app runs on it)
- **PostgreSQL** — the database itself. Download it free from
  [postgresql.org/download](https://www.postgresql.org/download/)
- A PostgreSQL client to peek inside your database (optional but helpful):
  - [TablePlus](https://tableplus.com/) — clean, free tier available
  - [pgAdmin](https://www.pgadmin.org/) — free, comes bundled with PostgreSQL

> 💡 If you'd rather skip installing PostgreSQL locally, you can use a free
> cloud database instead. [Neon](https://neon.tech) gives you a free PostgreSQL
> database in 30 seconds with no credit card. Just sign up, create a project,
> and copy the connection string they give you — then skip straight to Step 2.

---

## Step 1 — Create Your Database

Open your terminal and type:

```bash
psql -U postgres
```

This opens the PostgreSQL command line. Now create a fresh database for
TalentScout:

```sql
CREATE DATABASE talentscout;
```

Then exit:

```sql
\q
```

That's it. You now have an empty database called `talentscout` waiting to be
filled.

---

## Step 2 — Add Your Database URL to `.env.local`

Open the `.env.local` file in the root of the project. You already have your
Gemini key in there. Add a second line for the database:

```
GEMINI_API_KEY="AIzaSy..."
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/talentscout"
```

Replace `yourpassword` with whatever password you set when you installed
PostgreSQL. If you used a cloud database like Neon, paste the connection string
they gave you instead — it'll look something like:

```
DATABASE_URL="postgresql://username:password@ep-something.us-east-2.aws.neon.tech/talentscout?sslmode=require"
```

> 🔒 `.env.local` is already in `.gitignore` — this connection string will
> never be committed to git. It stays on your machine.

---

## Step 3 — Install Prisma

In your terminal, from the project root, run:

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

The second command creates two things:
- A `prisma/` folder at the root of your project
- A `prisma/schema.prisma` file — this is where you describe your database
  tables in plain English

It also adds `DATABASE_URL` to a `.env` file. Since we're using `.env.local`,
open `prisma/schema.prisma` and update the datasource block to read from the
right place:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Step 4 — Define Your Database Schema

Open `prisma/schema.prisma`. This file describes what your database tables look
like. Replace the entire contents with this:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Candidate {
  id                String   @id @default(cuid())
  name              String
  title             String
  company           String
  skills            String[]
  experience        Int
  education         String
  location          String
  salaryExpectation String?
  summary           String
  availability      String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Let's break down what each line means in plain English:

```
model Candidate {
  id                String    ← every candidate gets a unique ID, auto-generated
  name              String    ← their full name, required
  title             String    ← job title, required
  company           String    ← current employer, required
  skills            String[]  ← a list of skill strings (e.g. ["Python", "AWS"])
  experience        Int       ← years of experience as a whole number
  education         String    ← education background
  location          String    ← where they're based
  salaryExpectation String?   ← the ? means this is optional, can be empty
  summary           String    ← their profile summary paragraph
  availability      String    ← "actively looking", "not looking", etc.
  createdAt         DateTime  ← automatically set when the record is created
  updatedAt         DateTime  ← automatically updated whenever the record changes
}
```

---

## Step 5 — Push the Schema to Your Database

Now tell Prisma to actually create that table in your PostgreSQL database:

```bash
npx prisma db push
```

You'll see output like:

```
✓ Generated Prisma Client
✓ Your database is now in sync with your Prisma schema.
```

That means the `Candidate` table now exists in your database. You can verify
this by opening TablePlus or pgAdmin and connecting to your `talentscout`
database — you'll see the table sitting there, empty and ready.

---

## Step 6 — Seed the Database with Your Existing Candidates

Right now the database is empty. Let's fill it with the 10 candidates that are
currently in `src/data/candidates.ts`.

Create a new file at `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing candidates first so we don't get duplicates
  await prisma.candidate.deleteMany();

  await prisma.candidate.createMany({
    data: [
      {
        id: "c001",
        name: "Alex Chen",
        title: "Senior Backend Engineer",
        company: "Stripe",
        skills: ["Python", "Node.js", "AWS", "PostgreSQL", "Docker", "Redis", "GraphQL"],
        experience: 7,
        education: "MS Computer Science, Stanford",
        location: "San Francisco, CA",
        salaryExpectation: "$170,000 - $200,000",
        summary: "Experienced backend engineer specializing in payment systems and distributed architectures. Led migration of monolith to microservices serving 10M+ requests/day.",
        availability: "open to opportunities",
      },
      {
        id: "c002",
        name: "Priya Sharma",
        title: "Full Stack Developer",
        company: "Atlassian",
        skills: ["TypeScript", "React", "Node.js", "AWS", "MongoDB", "Docker", "Kubernetes"],
        experience: 5,
        education: "BE Computer Engineering, IIT Bombay",
        location: "Remote",
        salaryExpectation: "$140,000 - $165,000",
        summary: "Full stack developer with a strong backend focus. Built real-time collaboration features used by 50K+ teams daily.",
        availability: "actively looking",
      },
      {
        id: "c017",
        name: "Jennifer Liu",
        title: "Senior Backend Engineer",
        company: "Plaid",
        skills: ["Python", "Node.js", "AWS", "PostgreSQL", "Docker", "Kafka", "TypeScript"],
        experience: 6,
        education: "BS Computer Science, University of Illinois",
        location: "San Francisco, CA (Hybrid)",
        salaryExpectation: "$165,000 - $190,000",
        summary: "Senior backend engineer in fintech building secure banking APIs. Led PCI-DSS compliance initiatives across 3 services.",
        availability: "actively looking",
      },
      {
        id: "c035",
        name: "Hassan Ahmed",
        title: "Backend Engineer",
        company: "Brex",
        skills: ["Python", "Node.js", "AWS", "PostgreSQL", "Docker", "Kafka", "TypeScript", "Redis"],
        experience: 5,
        education: "BS Computer Science, University of Waterloo",
        location: "San Francisco, CA (Hybrid)",
        salaryExpectation: "$155,000 - $180,000",
        summary: "Backend engineer in fintech focused on card issuing and spend management APIs. Built real-time fraud detection pipeline.",
        availability: "actively looking",
      },
      {
        id: "c003",
        name: "Marcus Johnson",
        title: "Staff Engineer",
        company: "Netflix",
        skills: ["Java", "Python", "AWS", "Kafka", "Cassandra", "Docker", "Terraform", "Go"],
        experience: 12,
        education: "BS Computer Science, MIT",
        location: "Los Angeles, CA",
        salaryExpectation: "$220,000 - $260,000",
        summary: "Staff engineer with deep expertise in streaming infrastructure and content delivery systems. Architected services handling 200M+ subscribers.",
        availability: "not looking",
      },
      {
        id: "c007",
        name: "Emily Davis",
        title: "Junior Backend Developer",
        company: "Twilio",
        skills: ["Python", "Node.js", "PostgreSQL", "Docker", "REST APIs"],
        experience: 2,
        education: "BS Computer Science, UC Berkeley",
        location: "San Francisco, CA",
        salaryExpectation: "$95,000 - $115,000",
        summary: "Early-career backend developer with strong fundamentals. Contributed to API platform serving 100K+ developers.",
        availability: "actively looking",
      },
      {
        id: "c016",
        name: "Chris Taylor",
        title: "Product Designer",
        company: "Airbnb",
        skills: ["Figma", "User Research", "Prototyping", "HTML", "CSS", "Design Systems"],
        experience: 8,
        education: "MFA Interaction Design, SVA",
        location: "New York, NY",
        salaryExpectation: "$150,000 - $175,000",
        summary: "Product designer leading Airbnb's host experience redesign. Expertise in design systems and accessibility.",
        availability: "happy where I am",
      },
      {
        id: "c030",
        name: "Emma Watson",
        title: "UX Researcher",
        company: "Spotify",
        skills: ["User Research", "Surveys", "A/B Testing", "SQL", "Figma", "Tableau"],
        experience: 5,
        education: "MS HCI, Carnegie Mellon",
        location: "Remote",
        salaryExpectation: "$130,000 - $150,000",
        summary: "UX researcher driving product decisions through mixed-methods research. Led studies informing Spotify's podcast discovery redesign.",
        availability: "open to opportunities",
      },
      {
        id: "c010",
        name: "David Kim",
        title: "Frontend Engineer",
        company: "Figma",
        skills: ["TypeScript", "React", "CSS", "WebGL", "Canvas API", "Node.js", "Design Systems"],
        experience: 6,
        education: "BFA Design + CS Minor, Rhode Island School of Design",
        location: "San Francisco, CA",
        salaryExpectation: "$165,000 - $190,000",
        summary: "Frontend specialist building high-performance collaborative design tools. Deep expertise in canvas rendering and real-time sync.",
        availability: "happy where I am",
      },
      {
        id: "c051",
        name: "Andrew Mitchell",
        title: "Platform Engineer",
        company: "Vercel",
        skills: ["TypeScript", "Node.js", "AWS", "Docker", "Kubernetes", "Go", "Terraform"],
        experience: 6,
        education: "BS Computer Science, Stanford",
        location: "Remote",
        salaryExpectation: "$170,000 - $195,000",
        summary: "Platform engineer building serverless deployment infrastructure. Designed edge function runtime supporting 100K+ deployments daily.",
        availability: "open to opportunities",
      },
    ],
  });

  console.log("✅ Database seeded with 10 candidates.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Now add the seed command to your `package.json`. Open it and add this inside
the `"scripts"` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "seed": "npx tsx prisma/seed.ts"
}
```

Also install `tsx` so Node can run TypeScript files directly:

```bash
npm install -D tsx
```

Now run the seed:

```bash
npm run seed
```

You should see:

```
✅ Database seeded with 10 candidates.
```

Open your database client and look inside the `Candidate` table — all 10
candidates are now rows in your database.

---

## Step 7 — Create a Prisma Client Singleton

You don't want to create a new database connection on every request — that
would be slow and wasteful. Create a shared client file at `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

This pattern makes sure only one database connection is open at a time, even
during hot reloads in development.

---

## Step 8 — Create the Candidates API Route

Create a new file at `src/app/api/candidates/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const candidates = await db.candidate.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return NextResponse.json(
      { error: "Failed to load candidates from database." },
      { status: 500 }
    );
  }
}
```

That's the entire API route. When the candidates page calls `/api/candidates`,
this function runs on the server, queries your database, and returns the results
as JSON.

---

## Step 9 — Update the Candidates Page to Fetch from the API

Open `src/app/candidates/page.tsx`. Right now it imports candidates directly
from the static file:

```typescript
// This line at the top — find it and remove it
import candidates from "@/data/candidates";
```

Replace the static import with a `useEffect` that fetches from your new API.
Find the section where `parsedJD` is loaded from localStorage and add the
candidates fetch right alongside it:

```typescript
// Replace the static import and the scored useMemo with this:

const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
const [loadingCandidates, setLoadingCandidates] = useState(true);

useEffect(() => {
  fetch("/api/candidates")
    .then((res) => res.json())
    .then((data) => {
      setCandidates(data);
      setLoadingCandidates(false);
    })
    .catch(() => setLoadingCandidates(false));
}, []);
```

And update the `scored` useMemo to depend on the new `candidates` state:

```typescript
const scored = useMemo(() => {
  if (!parsedJD || candidates.length === 0) return [];
  return scoreCandidates(candidates, parsedJD);
}, [parsedJD, candidates]);
```

While candidates are loading, show a simple message. Find the `if (!parsedJD)`
early return and add one above it:

```typescript
if (loadingCandidates) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-400 text-sm">Loading candidates...</p>
    </div>
  );
}
```

---

## Step 10 — Verify Everything Works

```
┌──────────────────────────────────────────────────────────┐
│                  VERIFICATION CHECKLIST                  │
│                                                          │
│  ✓  PostgreSQL is running                                │
│  ✓  DATABASE_URL is in .env.local                        │
│  ✓  npx prisma db push ran without errors                │
│  ✓  npm run seed printed "✅ Database seeded"            │
│  ✓  /api/candidates returns JSON in the browser          │
│  ✓  Candidates page loads the same 10 profiles as before │
│  ✓  Pipeline still works end-to-end                      │
└──────────────────────────────────────────────────────────┘
```

To test the API directly, open your browser and go to:

```
http://localhost:3000/api/candidates
```

You should see a JSON array of all 10 candidates. If you see that, everything
is wired up correctly.

---

## What You Can Do Now That You Couldn't Before

Once the database is connected, the static file is just a backup. The real
power is that you can now:

**Add candidates without touching code**

```sql
INSERT INTO "Candidate" (id, name, title, company, skills, experience,
  education, location, "salaryExpectation", summary, availability)
VALUES (
  'c056',
  'Sarah Kim',
  'Backend Engineer',
  'Shopify',
  ARRAY['Python', 'Node.js', 'AWS'],
  4,
  'BS Computer Science, UBC',
  'Vancouver, Canada',
  '$130,000 - $155,000',
  'Backend engineer focused on e-commerce APIs.',
  'actively looking'
);
```

**Build an admin page to manage candidates through a UI** — just create a
`/admin/candidates` page that calls your API with POST/PUT/DELETE methods.

**Filter at the database level** — instead of loading all candidates and
filtering in the browser, you can pass query parameters to `/api/candidates`
and let PostgreSQL do the filtering:

```typescript
// Example: /api/candidates?minExperience=5&location=Remote
const candidates = await db.candidate.findMany({
  where: {
    experience: { gte: Number(minExperience) },
    location: { contains: location },
  },
});
```

**Scale to thousands of candidates** — the current browser-side scoring works
fine for 10–50 candidates. With a database you can paginate, index, and search
across any number of profiles.

---

## How the Data Flows Now

```
User visits /candidates
        │
        ▼
candidates/page.tsx
  useEffect fires
        │
        ▼
  fetch("/api/candidates")
        │
        ▼
  src/app/api/candidates/route.ts   ← runs on the server
        │
        ▼
  db.candidate.findMany()           ← Prisma builds the SQL query
        │
        ▼
  SELECT * FROM "Candidate"         ← PostgreSQL executes it
        │
        ▼
  Returns rows as JSON
        │
        ▼
  setCandidates(data)               ← React state updates
        │
        ▼
  scoreCandidates() runs in browser ← same scoring logic as before
        │
        ▼
  Table renders with live data ✓
```

---

## Troubleshooting

**"Can't reach database server"**
PostgreSQL isn't running. On Mac: `brew services start postgresql`. On Windows:
open Services and start "postgresql-x64-xx".

**"Environment variable not found: DATABASE_URL"**
Prisma looks for `.env` by default, not `.env.local`. Either copy your
`DATABASE_URL` into a `.env` file at the root, or add this to
`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

And run your dev server with:
```bash
NODE_ENV=development npx dotenv -e .env.local -- npx prisma db push
```

**"Prisma Client is not generated"**
Run `npx prisma generate` to regenerate the client after any schema changes.

**"Relation Candidate does not exist"**
You haven't pushed the schema yet. Run `npx prisma db push`.

**Seed runs but table is empty**
Check that your `DATABASE_URL` points to the right database. Run
`npx prisma studio` — it opens a browser UI showing your database contents.

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│                   USEFUL COMMANDS                       │
│                                                         │
│  npx prisma db push       push schema changes to DB     │
│  npx prisma studio        open visual DB browser        │
│  npx prisma generate      regenerate Prisma client      │
│  npm run seed             fill DB with starter data     │
│  npx prisma db pull       pull schema from existing DB  │
│  npx prisma migrate dev   create a migration file       │
└─────────────────────────────────────────────────────────┘
```

---

*That's everything. The app works exactly the same from the user's perspective —
the pipeline, scoring, engagement, and shortlist all behave identically. The
only difference is that candidates now live in a real database you can manage,
query, and grow over time.*
