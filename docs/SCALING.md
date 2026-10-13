# Scaling TalentOS: from proof of concept to paginated sourcing engine

This document is two things: an honest account of what the current architecture can and can't do, and a build plan detailed enough to hand to a dedicated coding agent (e.g. Claude Code) to implement.

## 1. The goal

Today one search returns ~20 candidate cards in ~30–35 seconds. The target: searches that surface **hundreds of unique candidates with pages 1, 2, 3…**, ranked by relevance, with the ability to keep digging without re-running the whole pipeline.

## 2. Current architecture (what the agent inherits)

| Layer | Today |
|---|---|
| Language | TypeScript throughout (React 19 + Vite frontend, Vercel serverless functions) |
| LLM | DeepSeek V4.1 Flash (default) / V4 Pro — query parsing + result structuring |
| Web sourcing | Tavily Search API: 5 parallel `advanced` queries × 12 results, filtered to profile URLs, deduped |
| Structuring | ≤10 rich cards via LLM + ≤12 thin Scholar cards via deterministic `mergeScholarAuthors()` |
| Backend | Stateless Vercel functions (`api/parse.ts`, `api/generate-candidates.ts`, shared `api/_lib.ts`); 60s Hobby timeout |
| Storage | None. No database, no queue, no cache |
| Frontend | Single-page React; one-shot search → cards; no persistence |
| Auth | Passcode header (`x-app-passcode`) guarding the two API routes — quota protection, not real auth |

Key files: `api/_lib.ts` holds nearly all backend logic (`buildTavilyQueries`, `normalizeCriteria`, `normalizeCandidates`, `mergeScholarAuthors`, `parseTavilyResultsLocally`, `callDeepSeek`, `searchTavily`). `src/App.tsx` owns search state; `src/components/ResultCard.tsx` renders cards; `src/components/FilterChips.tsx` renders parsed criteria.

## 3. What has to change, front by front

### Language — nothing
TypeScript handles all of this. The constraint is the execution model (stateless, 60s functions), not the language. Do not rewrite in another language.

### Web crawling — query diversification (the core sourcing change)
Tavily has **no offset/pagination** — you cannot request "results 21–40" of the same query. Hundreds of unique candidates therefore require *many differently-angled queries* rather than deeper pages:
- Split today's grouped queries apart: one query per school, per venue cluster, per seniority phrasing ("PhD candidate" vs "doctoral researcher" vs "postdoc").
- Add date-bounded variants and alternate phrasings to surface different slices of the index.
- Each variant is additional Tavily calls — budget accordingly (see Cost).
- True self-operated crawling (fetching Scholar pages directly) is explicitly out of scope: it means headless browsers, bot mitigation, and proxy rotation.

### Algorithm — three new problems
1. **Dedupe at scale.** The same person surfaces via Scholar + LinkedIn + GitHub. Build fuzzy name matching (normalized names, plus URL/persona clustering) so they merge into one card. Today's dedupe is exact-URL only.
2. **Ranking.** With hundreds of candidates you need a scoring function to order pages: venue hit weight, school hit weight, title/role match, recency signals. The LLM does not return ranked output — score deterministically after structuring.
3. **Batched structuring.** Move from one LLM call to N batched calls over chunked raw results, then merge. Keep the existing normalizers (`normalizeCandidates`) as the contract — every batch's output must pass through them.

### Backend — async job pipeline (the core architectural change)
Request/response no longer fits. The new shape:
- `POST /api/search` → validates, creates a **job**, returns `{ jobId }` immediately.
- A **worker** picks up the job: runs query variants in waves, structures batches, writes candidates + progress to storage.
- `GET /api/search/:jobId` → `{ status, foundSoFar, totalWaves }`.
- `GET /api/search/:jobId/candidates?page=2` → paginated, ranked cards.
- Keep the existing passcode header on all routes.

### Data/storage — net-new
Required: a database for jobs, candidates, seen-URL sets, and page cursors. Recommended: Postgres (Neon or Supabase — generous free tiers, no new language). Redis (Upstash) is a fine alternative for job state + dedupe sets if you want to stay key-value. This is the largest net-new piece of the project.

### Deployment — beyond Hobby
Vercel Hobby cannot host the worker side (60s cap, no background execution after response). Two viable paths:
- **A: Vercel Pro / Fluid** — longer timeouts, Vercel Queues/Workflow for the pipeline. Stays in one platform.
- **B: Split** — keep the frontend + thin API on Vercel; run the worker as a small always-on service (Render, Fly.io). More moving parts, cheaper at low volume.
Either way this introduces real monthly cost and more env vars/secrets to manage.

### Frontend — job UX
From fire-and-forget to: submit → progress state ("searching… 47 candidates so far") via polling → paginated grid. For hundreds of cards, use a virtualized list (e.g. `virtua` or `react-window`) rather than rendering everything. Keep the existing card component and design language.

### Cost — the load-bearing constraint
- **Tavily:** ~20–50 searches per deep query vs 5 today. On the 1,000 free searches/month tier that's roughly 20–50 deep searches/month. Track per-search usage and show it in the UI.
- **DeepSeek:** structuring 100+ candidates is ~10× today's tokens per search — still cheap in absolute terms (DeepSeek pricing), but budget it.
- **Infra:** database + worker hosting (see Deployment).
- Add per-user/per-passcode quota tracking early — one deep search should not be able to eat the month's Tavily quota.

## 4. Phased build plan

**Phase 1 — Storage + jobs (foundation).** Provision Postgres (Neon). Schema: `jobs(id, criteria JSON, status, created_at)`, `candidates(id, job_id, data JSONB, score float, created_at)`, `seen_urls(job_id, url)`. Convert `POST /api/generate-candidates` into job creation returning `{ jobId }`; add status + paginated candidates endpoints. Frontend: progress UI + polling. Ship with the *current* single-wave sourcing so the pipeline works end-to-end before scaling it.

**Phase 2 — Worker + query diversification.** Move sourcing into a worker (Vercel Workflow/Queue or Render/Fly service). Implement query-variant generation (per-school, per-venue-cluster, phrasing rotations). Waves write incrementally so page 1 is viewable before the job finishes.

**Phase 3 — Dedupe + ranking.** Fuzzy name dedupe on write; deterministic scoring function; `page` param returns score-ordered slices. Add per-search Tavily usage to the job record and surface it in the UI.

**Phase 4 — Hardening.** Quota tracking per passcode, retry/backoff on Tavily rate limits, virtualized results grid, result-set caching (same criteria within 24h returns the stored job instead of re-searching).

## 5. Handoff instructions for the coding agent

- **Run locally:** `npm install`, copy `.env.local` (see README), `npm run dev`. The API routes run as Vercel dev functions.
- **Env vars:** `LLM_PROVIDER` (`deepseek`), `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, `APP_PASSCODE`. Never commit keys; they live only in env.
- **Where logic lives:** `api/_lib.ts` is the backend. `buildTavilyQueries(criteria)` builds the fan-out; `normalizeCriteria` / `normalizeCandidates` are the LLM-output contracts — keep them as the single choke point for schema (the frontend crashes on missing arrays otherwise; `ResultCard` and `FilterChips` have guards, keep them).
- **Pushing:** this repo deploys via GitHub pushes (Vercel auto-deploys `main`). Verify every push landed by checking the remote — do not assume.
- **The 60s budget** (Phase 0 constraint, until the worker exists): keep any single function execution under ~45s. Current budget: 12 results/Tavily query, top-15 structuring input, 400-char snippets, ≤10 LLM cards + ≤12 Scholar sweep.
- **Don't break the demo.** The live site is linked from the owner's portfolio. Keep the one-shot search path working until the job pipeline fully replaces it (Phase 1 ships both; cut over explicitly).
