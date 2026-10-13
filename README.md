# TalentOS

**LLM-backed natural-language talent search** — describe the candidate you need in plain English; TalentOS parses the query, searches the live web, and returns structured candidate cards.

🔗 **Live demo:** https://talent-os-theta.vercel.app

Built and designed by [Kevin Cruz](https://www.linkedin.com/in/kevin-cruz-76b66468) — a technical recruiter who got tired of boolean strings.

## Why this exists

Recruiters think in people, not query syntax. A hiring manager says *"find me soon-to-graduate PhDs from U of T, Waterloo, or McGill who've published at NeurIPS or ICLR"* — and today that means 45 minutes of hand-built Scholar, LinkedIn, and GitHub x-ray searches. TalentOS turns that sentence into a live multi-source search and hands back candidate cards: name, title, affiliation, skills, experience, why they match, and a source link. It's a proof of concept, built to work the way a sourcer actually works.

## Architecture

```
natural-language query
        │
        ▼
┌───────────────┐
│  Query parser │  DeepSeek V4.1 Flash (default) or V4 Pro —
│  (LLM)        │  extracts role, seniority, location, skills,
└───────────────┘  industry, education signals, publication
        │          venues, target schools → normalized criteria
        ▼
┌───────────────┐
│  Query fan-out│  5 parallel Tavily searches: broad web, LinkedIn
│  (Tavily)     │  x-ray, Scholar/Semantic Scholar/arXiv, GitHub,
└───────────────┘  + a venues × schools × PhD-terms academic query
        │
        ▼
┌───────────────┐
│  Structuring  │  DeepSeek structures the top results into
│  (LLM + code) │  candidate cards (≤10 rich cards); a deterministic
└───────────────┘  sweep adds thin Scholar-author cards the LLM
        │          skipped (deduped by name, zero LLM cost)
        ▼
  candidate cards → React UI
```

**Serverless throughout.** The whole backend is Vercel functions (`api/`); there is no persistent server, no database, no queue. That keeps hosting free and deploys trivial — and it shapes every design decision below.

## Design decisions

- **DeepSeek over Gemini.** Switched from Gemini to DeepSeek V4.1 Flash as the default engine: dramatically cheaper per request, plenty capable for parsing and structuring. DeepSeek has no native web-search grounding, so live sourcing runs through Tavily instead.
- **Tavily fan-out instead of one search.** A single query misses whole candidate pools. Five angled queries (general, LinkedIn, academic, GitHub, venues×schools) run in parallel and merge — researchers who never touch LinkedIn still surface via Scholar.
- **Never trust the LLM's JSON.** Every LLM output passes through a normalizer (`normalizeCriteria`, `normalizeCandidates`) that maps the model's invented keys onto the frontend's schema and fills safe defaults. A malformed response degrades gracefully; it never blanks the page. (This was learned the hard way — twice.)
- **Thin cards beat no cards.** A Google Scholar author page with a name and publications but no title/company still becomes a card. For a recruiter, a name + Scholar link is a lead; dropping it is data loss.
- **Strict relevance filter.** When publication venues are specified, candidates from unrelated disciplines are excluded rather than padding the count. Fewer, better cards.
- **Passcode gate.** The search endpoints sit behind an `x-app-passcode` header (sessionStorage on the client, 401 re-prompts). It exists to protect the Tavily quota, not as real auth.
- **The 60-second budget.** Vercel's Hobby tier kills functions at 60s. The pipeline is budgeted to fit: 12 results per Tavily query, top-15 structuring input, truncated snippets, ≤10 LLM cards + ≤12 Scholar-sweep cards. A full search returns in ~30–35s.

## Design language

TalentOS shares a visual system with the rest of my portfolio work: **Space Grotesk** + **Space Mono**, light glassmorphism, ink `#0B0F19` on cyan `#00B4D8`, grid-mesh backgrounds, pill navigation. It sits alongside the [Recruiting Tool Library](https://kevczrecruits.github.io/recruiting-tool-library/) as one cohesive set.

## Run locally

**Prerequisites:** Node.js

1. `npm install`
2. Create `.env.local` (open when unset — no passcode required for local dev):
   ```
   LLM_PROVIDER=deepseek
   DEEPSEEK_API_KEY=your-key
   TAVILY_API_KEY=your-key
   APP_PASSCODE=your-passcode   # optional locally
   ```
3. `npm run dev`

Deploy: import the repo in the Vercel dashboard and set the same variables as Environment Variables (`LLM_PROVIDER` as plain config, the keys as Secrets).

## Scaling

This is a proof of concept, and it's honest about its ceiling: one search returns ~20 candidates, there's no pagination, no result history, no ranking across pages. Getting to hundreds of paginated, ranked results needs a second system — async workers, a database, query diversification, and real hosting. The full breakdown, including a phased build plan written to hand to a coding agent, lives in [docs/SCALING.md](docs/SCALING.md).

## Stack

React 19 · Vite · Tailwind CSS 4 · Vercel serverless functions · DeepSeek API · Tavily Search API · lucide-react · motion
