# Unifying the portfolio: TalentOS + Recruiting Tool Library + portfolio site

A plan for bringing Kevin's three web properties together into one cohesive presence.

## 1. Current state

| Property | Repo | Hosting | Stack |
|---|---|---|---|
| Portfolio | `Kevczrecruits/kevczrecruits.github.io` | GitHub Pages | v0-built site, project cards from `lib/portfolio-data.ts` |
| Recruiting Tool Library | `Kevczrecruits/recruiting-tool-library` | GitHub Pages | Vanilla HTML + `tools.csv` (source of truth) + base64 icon JS |
| TalentOS | `Kevczrecruits/Talent-OS-` | Vercel | React 19 + Vite + Tailwind, serverless API |

The good news: all three already share a design language — **Space Grotesk** + **Space Mono**, light glassmorphism, ink `#0B0F19` / cyan `#00B4D8`, grid-mesh backgrounds, pill navigation. They look like one family; they just don't navigate like one.

## 2. Options

### Option A — Hub and spoke (recommended)
Keep three repos and three deployments. Make them *feel* like one site:
- Identical pill nav on all three: **Home · Tool Library · TalentOS** (each linking to the other two).
- One shared `tokens.css` (fonts, colors, glassmorphism utilities) copied or imported into each repo so the family resemblance can't drift.
- Portfolio project cards deep-link both ways (already done for TalentOS → portfolio; add Tool Library → TalentOS cross-links where natural, e.g. a "sourcing AI" card in the library).
- Optional: a custom domain with subdomains (`talentos.kevincruz.dev`, `tools.kevincruz.dev`) — or keep the current URLs; nothing breaks either way.

**Pros:** zero migration risk, each property keeps its ideal host (TalentOS needs Vercel for serverless; the others are free static), can ship incrementally. **Cons:** three deploys, three repos to keep in sync.

### Option B — Monorepo, one deployment
Merge everything into a single Vite (or Next.js) app on Vercel with routes: `/` portfolio, `/tools` library, `/talentos` search.
- Port the Tool Library's CSV-driven page into a React route (the `tools.csv` → render pipeline ports cleanly; base64 icons carry over).
- Port or rebuild the portfolio sections as routes/components.
- TalentOS already lives in this stack — it becomes a route with its API functions untouched.

**Pros:** one deploy, one nav, one design system, easiest long-term maintenance. **Cons:** the two GitHub Pages properties must be rebuilt in the new stack — the biggest upfront cost, and the portfolio is v0-built, so expect manual porting.

### Option C — Embed
Iframe the Tool Library and TalentOS into portfolio pages. **Not recommended** — breaks mobile layouts, deep-linking, and SEO; feels cheap next to the current polish.

## 3. Recommended path

**Phase 1 (small, shippable now): Option A.** Add the shared three-link pill nav to all three properties and extract `tokens.css`. This is an afternoon's work and immediately makes the portfolio feel like one product family.

**Phase 2 (when appetite allows): migrate toward B.** Start with the Tool Library (simplest — it's data + one page), then the portfolio. TalentOS stays as-is throughout; it just changes address from a subdomain to a route.

## 4. Notes for whoever builds it

- The design tokens are the contract: Space Grotesk (display) + Space Mono (labels/data), `--ink: #0B0F19`, `--cyan: #00B4D8`, light glassmorphism (`backdrop-blur`, white/60 fills), grid-mesh background. Match the Recruiting Tool Library's kicker style — it's the reference implementation.
- TalentOS's passcode gate must survive any move — it's the only thing protecting the Tavily quota.
- Keep GitHub Pages' auto-deploy for the static properties until/unless Phase 2 moves them; don't pay Vercel for what GitHub hosts free.
- Update the portfolio's `lib/portfolio-data.ts` links last, after the new structure is live and verified (stale cache: hard-refresh or Incognito to confirm).
