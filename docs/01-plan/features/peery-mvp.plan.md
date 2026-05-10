# Peery MVP Implementation Plan

## Context

- **Discovery**: `~/Documents/Obsidian Vault/10_프로젝트 기획/peery-discovery/peery-master-plan.md`
- **Architecture**: Remix (React Router v7) on CF Pages + Workers + D1/KV/Queues/R2 + GitHub Actions
- **Scanner**: regex pattern matching + Dual LLM (Gemini 2.5 Flash + DeepSeek V4 Flash via OpenRouter)
- **Core UX**: Git URL submit → scan → PASS = listed (version-pinned) with rich metadata
- **Data**: 2-layer (immutable safety + mutable discovery metadata)
- **Target**: 3-week MVP, initial 200 skills scanned

## Phase 1: Scanner Core

> Dependencies: None (foundation layer)

### Step 1.1: Regex Pattern Ruleset

Create `scanner/rules/patterns.json` — danger patterns for agent skills.
Reference vskill 52 rules + promptfoo/Snyk/ClawSecure knowledge.

Categories:
- Destructive commands (rm -rf, DROP TABLE, git push --force, terraform destroy)
- External data exfiltration (curl/wget/fetch to external URLs, webhook sends)
- Secret theft (reading .env, SSH keys, credentials → sending externally)
- Hidden prompt injection (zero-width chars, base64 encoded instructions)
- Obfuscated code (eval, exec, encoded strings, dynamic requires)
- Abnormal file access (home directory, dotfiles, system paths)

Output: JSON array of `{id, category, pattern (regex), severity, description}`.

### Step 1.2: LLM System Prompts

Create `scanner/prompts/security-check.md` — system prompt for primary LLM (Gemini).
Create `scanner/prompts/cross-check.md` — system prompt for secondary LLM (DeepSeek).

Both enforce JSON schema response:
```json
{
  "safe": boolean,
  "threats": string[],
  "name": string,
  "summary": string (one sentence),
  "deep_review": string (300 words: unique tech, standout features, ideal use cases, setup),
  "category": string,
  "use_cases": string[] (max 5),
  "when_to_use": string,
  "how_to_use": string,
  "platforms": string[],
  "setup_complexity": "low" | "medium" | "high",
  "requires": string[],
  "similar_to": string[],
  "extends": string[],
  "depends_on": string[],
  "highlights": string[] (max 3),
  "score": { "usefulness": 1-10, "documentation": 1-10, "maintenance": 1-10, "uniqueness": 1-10 }
}
```

### Step 1.3: Scanner Logic

Create scanner modules:
- `scanner/fetch.ts` — GitHub API raw content fetch (given URL + optional sha/tag)
- `scanner/regex-check.ts` — load patterns.json, run against all files, return matches
- `scanner/llm-check.ts` — call Gemini + DeepSeek APIs, parse JSON, handle errors
- `scanner/decide.ts` — compare both LLM results: both PASS = safe, any FAIL = not listed

### Step 1.4: Decision Logic

Define consensus rules:
- Both PASS → listed
- Both FAIL → not listed
- Disagreement → conservative (not listed) + flag for manual review queue

---

## Phase 2: Backend (D1 + API)

> Dependencies: Phase 1 (scanner outputs feed into DB)

### Step 2.1: D1 Schema

Create migration for Cloudflare D1:

Tables:
- `skills` (id TEXT PK, git_url TEXT UNIQUE, name TEXT, summary TEXT, deep_review TEXT, category TEXT, use_cases TEXT/JSON, when_to_use TEXT, how_to_use TEXT, platforms TEXT/JSON, setup_complexity TEXT, requires TEXT/JSON, highlights TEXT/JSON, score_json TEXT, github_stars INT, ranking_score REAL, created_at TEXT, updated_at TEXT)
- `versions` (id TEXT PK, skill_id TEXT FK, git_sha TEXT, tag TEXT, scanned_at TEXT, status TEXT CHECK(pass/fail))
- `scan_logs` (id TEXT PK, version_id TEXT FK, scanner TEXT, result_json TEXT, created_at TEXT)
- `graph_edges` (id TEXT PK, source_skill_id TEXT, target_skill_id TEXT, edge_type TEXT, created_at TEXT)

Indexes: skills(git_url), versions(skill_id, git_sha), graph_edges(source_skill_id), graph_edges(target_skill_id)

### Step 2.2: API Routes

Implement in Remix route handlers (app/routes/api.*):

- `GET /api/verify?url=&sha=` → {verified, version, scanned_at} (KV cache first)
- `GET /api/skills` → paginated list, filters (category, platform, tag), sort (ranking_score, stars, recent)
- `GET /api/skills/:id` → full detail + version history + graph edges
- `POST /api/submit` → accept git_url, enqueue scan job via Queues
- `GET /api/graph` → nodes + edges for graph visualization (v1.1, but endpoint ready)

### Step 2.3: KV Cache Layer

On scan completion: write `url:sha → {verified, scanned_at}` to KV.
On /api/verify: check KV first, fallback to D1.

---

## Phase 3: GitHub Actions Pipeline

> Dependencies: Phase 1 (scanner code), Phase 2 (API to POST results back)

### Step 3.1: Scan Workflow

Create `.github/workflows/scan.yml`:
- Trigger: workflow_dispatch (with input: git_url, sha, callback_url)
- Steps: checkout scanner repo → setup Node → install deps → run scan → POST result to callback API
- Timeout: 10 minutes
- Concurrency: max 5 parallel scans

### Step 3.2: Scan Runner Script

Create `actions/run-scan.ts`:
1. Fetch target repo files via GitHub API
2. Run regex-check
3. Run llm-check (Gemini + DeepSeek in parallel)
4. Run decide
5. POST structured result to callback_url (Peery API)

---

## Phase 4: Frontend (Remix UI)

> Dependencies: Phase 2 (API endpoints)

### Step 4.1: Layout + Navigation

- Root layout with header (logo, nav), footer (AI transparency notice, links)
- Navigation: Home, Skills, Submit, About
- Responsive design (mobile-first)
- Service Worker registration (for future Push)

### Step 4.2: Home Page (/)

- Hero: "Find safe, verified agent skills" + search bar
- Stats: total verified, categories, platforms covered
- Recent verifications (latest 10)
- Category chips (quick filter)

### Step 4.3: Skills List (/skills)

- Search bar (name, description full-text)
- Filters: category, platform, setup_complexity
- Sort: ranking_score (default), stars, newest, usefulness
- Cards: name, summary, category badge, platform icons, score, stars
- Pagination

### Step 4.4: Skill Detail (/skills/:id)

- Header: name, badges (verified, platform icons)
- Deep review (A4 half-page formatted)
- Metadata: when_to_use, how_to_use, setup_complexity, requires
- Highlights (3 bullet points)
- Score breakdown (4 dimensions visual)
- Version history table
- Related skills (similar_to, extends, depends_on links)
- Badge embed code (copy button)
- Git URL link

### Step 4.5: Submit Page (/submit)

- Form: Git URL input + optional version tag
- Submit → shows "scanning..." status
- On complete → redirect to detail page or "not listed" message
- Rate limit notice (5 submissions/day)

### Step 4.6: About Page (/about)

- What Peery checks (2 things: malicious source + malicious intent)
- What "listed" means (safety verified at this version)
- What "not listed" means (not yet reviewed, NOT "unsafe")
- Disclaimers (point-in-time, no warranty, AI-assisted)
- ToS link, Privacy link

---

## Phase 5: Badge API

> Dependencies: Phase 2 (D1 data)

### Step 5.1: Badge SVG Endpoint

`GET /badge/:skill_id.svg` — returns dynamic SVG:
- Verified: green shield "Verified by Peery"
- Not found: gray shield "Not verified"

SVG template with dynamic text fill. Cache via KV (1 hour TTL).

---

## Phase 6: Legal Documents

> Dependencies: None (can run in parallel with any phase)

### Step 6.1: Terms of Service (/terms)

Key clauses: point-in-time assessment, no warranty, liability cap, AI-assisted analysis, scope limitation, "opinion not certification".

### Step 6.2: Privacy Policy (/privacy)

Minimal collection: submitted URLs (public data), no PII, no cookies (Phase 1), GDPR basis = legitimate interest.

### Step 6.3: AI Transparency Notice

Footer text: "Verifications use AI-assisted analysis (Gemini + DeepSeek). Results represent automated opinion, not certification."

---

## Phase 7: Initial Data Load

> Dependencies: Phase 1-5 all complete

### Step 7.1: Seed Top 200 Skills

Script to:
1. Fetch top skills from MCP Registry API + skills.sh GitHub leaderboard + awesome-lists
2. Queue each for scanning via /api/submit
3. Monitor completion
4. Verify data quality (spot-check 10 results manually)

### Step 7.2: Graph Edge Population

After 200+ skills scanned:
- Run batch job to resolve `similar_to` references (match by name/url across existing skills)
- Populate `graph_edges` table
- Verify graph connectivity

---

## Success Criteria

- [ ] 200+ skills verified and listed
- [ ] Search + filter functional
- [ ] Badge API returns valid SVG
- [ ] /api/verify responds in <200ms (KV cache hit)
- [ ] Scan pipeline completes in <5 minutes per skill
- [ ] Zero false positives on top 50 popular skills (manually verified)
- [ ] ToS + Privacy + AI notice published
- [ ] Deployed to peery.ai
