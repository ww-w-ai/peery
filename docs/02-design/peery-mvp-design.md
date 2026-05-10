# Peery MVP Design Document

> **Summary**: AI Agent/Skill Security Verification Registry — full-stack MVP from scanner to frontend
>
> **Project**: Peery
> **Version**: 0.1.0
> **Author**: CTO Lead
> **Date**: 2026-05-10
> **Status**: Approved
> **Planning Doc**: [peery-mvp.plan.md](../01-plan/features/peery-mvp.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 76% agent tool calls lack safety guards; no cross-platform source-level verification registry exists |
| **WHO** | Developers installing AI agent skills (all platforms: Claude Code, MCP, Cursor, etc.) |
| **RISK** | False positives erode trust; platforms build their own; zero adoption |
| **SUCCESS** | 200+ skills verified, search functional, badge API <200ms, scan <5min, zero false positives on top 50 |
| **SCOPE** | Scanner + Backend + GitHub Actions + Frontend + Badge + Legal + Initial 200 skills |

---

## 1. Overview

### 1.1 Design Goals

1. Zero-cost infrastructure (CF free tier for everything except LLM API)
2. Sub-200ms verification lookups via KV cache
3. Dual LLM cross-check for accuracy (conservative: disagreement = not listed)
4. Rich metadata extraction in single LLM call (security + discovery + graph)
5. Version-pinned immutable safety data + mutable discovery metadata

### 1.2 Design Principles

- **Simplicity**: Remix route handlers as API — no separate backend service
- **Conservative Safety**: "Not listed" means "not yet reviewed", never "unsafe"
- **Single Schema Call**: One LLM invocation extracts both security verdict and all metadata
- **Immutable Core**: Safety verdicts are version-locked and never overwritten

---

## 2. Architecture

### 2.1 Component Diagram

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                    Cloudflare Edge                            │
                    │                                                              │
┌──────────┐       │  ┌─────────────┐    ┌────────────┐    ┌──────────────────┐  │
│  Browser │──────▶│  │  CF Pages   │───▶│ CF Workers │───▶│  D1 (SQLite)     │  │
│  (User)  │◀──────│  │  (Remix SSR)│    │ (API routes│    │  skills/versions │  │
└──────────┘       │  └─────────────┘    │  + loaders)│    │  scan_logs/edges │  │
                    │                     └─────┬──────┘    └──────────────────┘  │
                    │                           │                                  │
                    │                     ┌─────▼──────┐    ┌──────────────────┐  │
                    │                     │ CF Queues   │    │  CF KV (Cache)   │  │
                    │                     │ (scan jobs) │    │  url:sha→result  │  │
                    │                     └─────┬──────┘    └──────────────────┘  │
                    └───────────────────────────┼──────────────────────────────────┘
                                                │
                                                ▼
                    ┌──────────────────────────────────────────────────────────────┐
                    │                   GitHub Actions                              │
                    │  ┌─────────────────────────────────────────────────────────┐ │
                    │  │  scan.yml (workflow_dispatch)                           │ │
                    │  │  1. Fetch repo files (GitHub API)                       │ │
                    │  │  2. Regex pattern check (52+ rules)                     │ │
                    │  │  3. LLM check (Gemini + DeepSeek in parallel)           │ │
                    │  │  4. POST result → Peery /api/callback                   │ │
                    │  └─────────────────────────────────────────────────────────┘ │
                    └──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User submits Git URL
  → POST /api/submit
  → Validate URL + rate limit check
  → Enqueue scan job (CF Queues)
  → Trigger GitHub Actions workflow_dispatch
  → GH Actions: fetch → regex → dual LLM → decide
  → POST /api/callback with results
  → Write to D1 (skills, versions, scan_logs, graph_edges)
  → Write to KV cache (url:sha → verified status)
  → User sees result on /skills/:id
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Frontend (Remix) | D1, KV | Data display, cache reads |
| API Routes | D1, KV, Queues | CRUD, caching, job dispatch |
| GitHub Actions | Scanner code, Peery API | Scan execution, result callback |
| Scanner | GitHub API, Gemini API, OpenRouter API | Source fetch, analysis |
| Badge API | KV, D1 | SVG generation with cached status |

---

## 3. Data Model

### 3.1 Entity Definitions

```typescript
// Skill — the core entity (listed agent skill)
interface Skill {
  id: string;              // nanoid
  git_url: string;         // UNIQUE — full GitHub URL
  name: string;            // extracted by LLM
  summary: string;         // one sentence
  deep_review: string;     // ~300 words rich review
  category: string;        // e.g., "code-generation", "security", "testing"
  use_cases: string[];     // max 5
  when_to_use: string;     // situation description
  how_to_use: string;      // setup/usage guide
  platforms: string[];     // e.g., ["claude-code", "cursor", "mcp"]
  setup_complexity: "low" | "medium" | "high";
  requires: string[];      // dependencies
  highlights: string[];    // max 3 standout features
  score: {
    usefulness: number;    // 1-10
    documentation: number; // 1-10
    maintenance: number;   // 1-10
    uniqueness: number;    // 1-10
  };
  github_stars: number;    // mutable, refreshed on new version
  ranking_score: number;   // computed: weighted combination
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
}

// Version — immutable safety record per version
interface Version {
  id: string;              // nanoid
  skill_id: string;        // FK → skills.id
  git_sha: string;         // commit hash
  tag: string;             // version tag if provided
  scanned_at: string;      // ISO 8601
  status: "pass" | "fail"; // immutable once set
}

// ScanLog — raw scanner output for auditing
interface ScanLog {
  id: string;              // nanoid
  version_id: string;      // FK → versions.id
  scanner: string;         // "regex" | "gemini" | "deepseek"
  result_json: string;     // raw JSON response stored as text
  created_at: string;      // ISO 8601
}

// GraphEdge — skill-to-skill relationships
interface GraphEdge {
  id: string;              // nanoid
  source_skill_id: string; // FK → skills.id
  target_skill_id: string; // FK → skills.id (or unresolved name)
  edge_type: string;       // "similar_to" | "extends" | "depends_on"
  created_at: string;      // ISO 8601
}
```

### 3.2 Entity Relationships

```
[Skill] 1 ──── N [Version]
   │                │
   │                └── 1 ──── N [ScanLog]
   │
   └── N ──── N [GraphEdge] (source + target)
```

### 3.3 Database Schema (Cloudflare D1)

```sql
-- Migration: 0001_initial.sql

CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  git_url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  deep_review TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'uncategorized',
  use_cases TEXT NOT NULL DEFAULT '[]',
  when_to_use TEXT NOT NULL DEFAULT '',
  how_to_use TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '[]',
  setup_complexity TEXT NOT NULL DEFAULT 'medium' CHECK(setup_complexity IN ('low', 'medium', 'high')),
  requires TEXT NOT NULL DEFAULT '[]',
  highlights TEXT NOT NULL DEFAULT '[]',
  score_json TEXT NOT NULL DEFAULT '{}',
  github_stars INTEGER NOT NULL DEFAULT 0,
  ranking_score REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  git_sha TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK(status IN ('pass', 'fail'))
);

CREATE TABLE scan_logs (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id),
  scanner TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  source_skill_id TEXT NOT NULL,
  target_skill_id TEXT NOT NULL,
  edge_type TEXT NOT NULL CHECK(edge_type IN ('similar_to', 'extends', 'depends_on')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_skills_git_url ON skills(git_url);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_ranking ON skills(ranking_score DESC);
CREATE INDEX idx_versions_skill_id ON versions(skill_id);
CREATE INDEX idx_versions_sha ON versions(skill_id, git_sha);
CREATE INDEX idx_scan_logs_version ON scan_logs(version_id);
CREATE INDEX idx_graph_source ON graph_edges(source_skill_id);
CREATE INDEX idx_graph_target ON graph_edges(target_skill_id);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/verify | Check verification status | None |
| GET | /api/skills | List skills (paginated, filtered) | None |
| GET | /api/skills/:id | Skill detail + versions + edges | None |
| POST | /api/submit | Submit skill for scanning | Rate limited |
| POST | /api/callback | Receive scan results from GH Actions | Secret token |
| GET | /badge/:id.svg | Dynamic badge SVG | None |

### 4.2 Detailed Specifications

#### GET /api/verify

Query params: `url` (required), `sha` (optional)

Response (200):
```json
{
  "verified": true,
  "version": { "sha": "abc123", "tag": "v1.0.0", "scanned_at": "2026-05-10T..." },
  "skill_id": "sk_xxx"
}
```

Response (404): `{ "verified": false, "reason": "not_found" }`

#### GET /api/skills

Query params: `page` (default 1), `limit` (default 20, max 100), `category`, `platform`, `sort` (ranking_score|stars|newest|usefulness), `q` (search)

Response (200):
```json
{
  "data": [{ "id": "...", "name": "...", "summary": "...", "category": "...", "platforms": [...], "score": {...}, "github_stars": 42, "ranking_score": 8.5 }],
  "pagination": { "page": 1, "limit": 20, "total": 200, "pages": 10 }
}
```

#### GET /api/skills/:id

Response (200):
```json
{
  "data": {
    "id": "...", "git_url": "...", "name": "...", "summary": "...",
    "deep_review": "...", "category": "...", "use_cases": [...],
    "when_to_use": "...", "how_to_use": "...", "platforms": [...],
    "setup_complexity": "low", "requires": [...], "highlights": [...],
    "score": { "usefulness": 8, "documentation": 7, "maintenance": 9, "uniqueness": 6 },
    "github_stars": 42, "ranking_score": 8.5,
    "versions": [{ "id": "...", "git_sha": "...", "tag": "v1.0", "scanned_at": "...", "status": "pass" }],
    "edges": [{ "type": "similar_to", "target_id": "...", "target_name": "..." }]
  }
}
```

#### POST /api/submit

Body: `{ "git_url": "https://github.com/user/repo", "tag": "v1.0.0" }`

Response (202): `{ "message": "Scan queued", "job_id": "job_xxx" }`

Rate limit: 5 per day per IP.

#### POST /api/callback

Headers: `X-Peery-Secret: <shared_secret>`

Body:
```json
{
  "git_url": "...",
  "git_sha": "...",
  "tag": "...",
  "safe": true,
  "threats": [],
  "metadata": { "name": "...", "summary": "...", ...all LLM fields },
  "scan_logs": [
    { "scanner": "regex", "result": {...} },
    { "scanner": "gemini", "result": {...} },
    { "scanner": "deepseek", "result": {...} }
  ]
}
```

Response (200): `{ "skill_id": "sk_xxx", "version_id": "ver_xxx", "status": "pass" }`

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Logo: Peery]  Home  Skills  Submit  About      [Theme] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    Main Content                           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  AI Transparency Notice | Terms | Privacy | GitHub       │
└──────────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Home (search/stats) → Skills List (filter/sort) → Skill Detail (review/badge)
                                                         ↑
Submit (form) → Scanning... → Result ─────────────────────┘
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| RootLayout | app/root.tsx | Header, footer, navigation |
| HomePage | app/routes/_index.tsx | Hero, stats, recent |
| SkillsList | app/routes/skills._index.tsx | Search, filter, cards |
| SkillDetail | app/routes/skills.$id.tsx | Full detail view |
| SubmitPage | app/routes/submit.tsx | Submission form |
| AboutPage | app/routes/about.tsx | Info + disclaimers |
| TermsPage | app/routes/terms.tsx | ToS |
| PrivacyPage | app/routes/privacy.tsx | Privacy policy |
| BadgeRoute | app/routes/badge.$id[.svg].tsx | SVG badge generation |
| SkillCard | app/components/SkillCard.tsx | Card for list view |
| ScoreDisplay | app/components/ScoreDisplay.tsx | 4-dimension visual |
| SearchBar | app/components/SearchBar.tsx | Search input with debounce |
| FilterPanel | app/components/FilterPanel.tsx | Category/platform filters |
| Pagination | app/components/Pagination.tsx | Page navigation |
| Badge Embed | app/components/BadgeEmbed.tsx | Copy embed code |

### 5.4 Page UI Checklist

#### Home Page (/)

- [ ] Hero: Headline "Find safe, verified agent skills"
- [ ] Hero: Search bar (full-text, redirects to /skills?q=)
- [ ] Stats: Total verified count (number)
- [ ] Stats: Categories count (number)
- [ ] Stats: Platforms covered count (number)
- [ ] Recent: Latest 10 verified skills (name + category + date)
- [ ] Categories: Chip/tag list for quick filtering (links to /skills?category=X)

#### Skills List (/skills)

- [ ] Search: Text input (name, description search)
- [ ] Filter: Category dropdown/select
- [ ] Filter: Platform multi-select (claude-code, cursor, mcp, etc.)
- [ ] Filter: Setup complexity (low/medium/high)
- [ ] Sort: Dropdown (ranking_score, stars, newest, usefulness)
- [ ] Card: Skill name (text, linked to detail)
- [ ] Card: Summary (one line)
- [ ] Card: Category badge (colored)
- [ ] Card: Platform icons
- [ ] Card: Score display (aggregate number)
- [ ] Card: GitHub stars count
- [ ] Pagination: Page numbers + prev/next

#### Skill Detail (/skills/:id)

- [ ] Header: Skill name (h1)
- [ ] Header: Verified badge (green shield icon)
- [ ] Header: Platform icons
- [ ] Header: Git URL (external link)
- [ ] Section: Deep review (formatted ~300 words)
- [ ] Section: When to use (text block)
- [ ] Section: How to use (text block)
- [ ] Section: Setup complexity indicator
- [ ] Section: Requirements list
- [ ] Section: Highlights (3 bullet points)
- [ ] Score: 4-dimension breakdown (usefulness, docs, maintenance, uniqueness)
- [ ] Versions: Table (sha, tag, scanned_at, status badge)
- [ ] Related: Similar skills links
- [ ] Related: Extends/depends_on links
- [ ] Badge: Embed code (markdown + HTML) with copy button
- [ ] Use Cases: List (max 5)

#### Submit Page (/submit)

- [ ] Form: Git URL input (required, validated)
- [ ] Form: Version tag input (optional)
- [ ] Button: Submit (triggers scan)
- [ ] Status: "Scanning..." indicator (after submit)
- [ ] Result: Success → link to skill detail page
- [ ] Result: Fail → "Not listed" message with explanation
- [ ] Notice: Rate limit info (5/day)

#### About Page (/about)

- [ ] Section: What Peery checks (2 categories: malicious source + malicious intent)
- [ ] Section: What "listed" means
- [ ] Section: What "not listed" means (NOT unsafe, just not reviewed)
- [ ] Section: Disclaimers (point-in-time, no warranty, AI-assisted)
- [ ] Links: ToS, Privacy Policy

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid input | Malformed URL or params | Return fieldErrors |
| 404 | Not found | Skill/version doesn't exist | Show "not found" page |
| 429 | Rate limited | >5 submissions/day | Show rate limit message |
| 500 | Internal error | D1/KV/LLM failure | Log, show generic error |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Maximum 5 submissions per day. Try again tomorrow.",
    "details": { "remaining": 0, "reset_at": "2026-05-11T00:00:00Z" }
  }
}
```

---

## 7. Security Considerations

- [x] Input validation: Git URL format check (must be valid GitHub URL)
- [x] Rate limiting: IP-based, 5 submissions/day (KV counter)
- [x] Callback authentication: X-Peery-Secret header verification
- [x] No user accounts in MVP (no auth needed for reads)
- [x] HTTPS enforced by Cloudflare
- [x] LLM prompt injection defense: structured JSON schema response, regex pre-filter
- [x] No PII collection (only public GitHub URLs)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | All 5 API endpoints | curl / fetch | Do |
| L2: UI Tests | Page elements per UI checklist | Visual inspection | Do |
| L3: E2E Tests | Submit → Scan → List flow | Manual | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test | Expected Status | Expected Response |
|---|----------|--------|------|:-:|---|
| 1 | /api/skills | GET | Returns paginated list | 200 | `.data` array, `.pagination.total` >= 0 |
| 2 | /api/skills/:id | GET | Returns full detail | 200 | `.data.id` exists, `.data.versions` array |
| 3 | /api/skills/invalid | GET | Returns not found | 404 | `.error.code` = "NOT_FOUND" |
| 4 | /api/verify?url=X | GET | Returns verify status | 200 | `.verified` boolean |
| 5 | /api/submit | POST | Accepts valid URL | 202 | `.job_id` exists |
| 6 | /api/submit | POST | Rejects invalid URL | 400 | `.error.code` = "INVALID_URL" |
| 7 | /api/callback | POST | Rejects without secret | 401 | `.error.code` = "UNAUTHORIZED" |

### 8.3 L2: UI Test Scenarios

| # | Page | Action | Expected Result |
|---|------|--------|----------------|
| 1 | / | Load | Hero + stats + recent skills visible |
| 2 | /skills | Load | Cards rendered with data |
| 3 | /skills | Filter by category | Result count changes |
| 4 | /skills/:id | Load | Full detail with score breakdown |
| 5 | /submit | Submit valid URL | Shows scanning status |
| 6 | /badge/:id.svg | Load | Valid SVG rendered |

---

## 9. Implementation Guide

### 9.1 File Structure

```
peery/
├── app/
│   ├── root.tsx                      # Root layout
│   ├── routes/
│   │   ├── _index.tsx                # Home page
│   │   ├── skills._index.tsx         # Skills list
│   │   ├── skills.$id.tsx            # Skill detail
│   │   ├── submit.tsx                # Submit form
│   │   ├── about.tsx                 # About page
│   │   ├── terms.tsx                 # Terms of Service
│   │   ├── privacy.tsx               # Privacy Policy
│   │   ├── badge.$id[.svg].tsx       # Badge SVG
│   │   ├── api.verify.tsx            # GET /api/verify
│   │   ├── api.skills.tsx            # GET /api/skills
│   │   ├── api.skills.$id.tsx        # GET /api/skills/:id
│   │   ├── api.submit.tsx            # POST /api/submit
│   │   └── api.callback.tsx          # POST /api/callback
│   ├── components/
│   │   ├── SkillCard.tsx
│   │   ├── ScoreDisplay.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── Pagination.tsx
│   │   └── BadgeEmbed.tsx
│   ├── lib/
│   │   ├── db.server.ts              # D1 helper
│   │   ├── kv.server.ts              # KV helper
│   │   └── utils.ts                  # Shared utilities
│   └── styles/
│       └── tailwind.css
├── scanner/
│   ├── rules/
│   │   └── patterns.json             # 52+ regex rules
│   ├── prompts/
│   │   ├── security-check.md         # Gemini system prompt
│   │   └── cross-check.md            # DeepSeek system prompt
│   ├── fetch.ts                      # GitHub API fetcher
│   ├── regex-check.ts                # Pattern matching
│   ├── llm-check.ts                  # Dual LLM caller
│   └── decide.ts                     # Consensus logic
├── actions/
│   └── run-scan.ts                   # GH Actions scan runner
├── .github/
│   └── workflows/
│       └── scan.yml                  # Scan workflow
├── migrations/
│   └── 0001_initial.sql              # D1 schema
├── public/
│   └── favicon.ico
├── wrangler.toml                     # CF config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

### 9.2 Implementation Order (Wave-based)

**Wave 1 (Parallel — no dependencies):**
1. [ ] Phase 1: Scanner Core (rules + prompts + modules)
2. [ ] Phase 6: Legal Documents (terms, privacy, about)

**Wave 2 (Depends on Wave 1):**
3. [ ] Phase 2: Backend (D1 schema + API routes + KV cache)

**Wave 3 (Depends on Wave 1+2):**
4. [ ] Phase 3: GitHub Actions (workflow + runner script)

**Wave 4 (Depends on Wave 2, parallel):**
5. [ ] Phase 4: Frontend (all pages + components)
6. [ ] Phase 5: Badge API (SVG endpoint)

**Wave 5 (Depends on all above):**
7. [ ] Phase 7: Initial Data Load (seed script + graph population)

### 9.3 Session Guide

| Module | Scope Key | Description | Files |
|--------|-----------|-------------|:-----:|
| Scanner Core | `module-1` | Regex rules + LLM prompts + scanner logic | 7 |
| Backend + DB | `module-2` | D1 migration + API routes + KV | 7 |
| GitHub Actions | `module-3` | Workflow + runner | 2 |
| Frontend Pages | `module-4` | All route files + components | 15 |
| Badge + Legal | `module-5` | SVG endpoint + legal pages | 4 |
| Data Seed | `module-6` | Seed script + graph builder | 2 |

---

## 10. Coding Conventions

### 10.1 Naming

| Target | Convention | Example |
|--------|-----------|---------|
| Route files | kebab-case with dots | `api.skills.$id.tsx` |
| Components | PascalCase | `SkillCard.tsx` |
| Server modules | kebab-case with .server | `db.server.ts` |
| Types | PascalCase interfaces | `Skill`, `Version` |
| Constants | UPPER_SNAKE | `MAX_SUBMISSIONS_PER_DAY` |

### 10.2 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| GEMINI_API_KEY | Gemini 2.5 Flash API | GH Actions secrets |
| OPENROUTER_API_KEY | DeepSeek via OpenRouter | GH Actions secrets |
| PEERY_CALLBACK_SECRET | Callback auth token | CF Workers + GH Actions |
| GITHUB_TOKEN | GitHub API (higher rate limit) | GH Actions (auto) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-10 | Initial design | CTO Lead |
