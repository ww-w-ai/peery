/**
 * app/lib/db.server.ts — D1 database helper
 * Design Ref: §2.1 — D1 Schema
 */

import { nanoid } from "nanoid";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  SCAN_QUEUE: Queue<Record<string, unknown>>;
  PEERY_CALLBACK_SECRET: string;
}

export interface SkillRow {
  id: string;
  git_url: string;
  name: string;
  summary: string;
  deep_review: string;
  category: string;
  use_cases: string;
  when_to_use: string;
  how_to_use: string;
  platforms: string;
  setup_complexity: string;
  requires: string;
  highlights: string;
  score_json: string;
  github_stars: number;
  ranking_score: number;
  created_at: string;
  updated_at: string;
}

export interface VersionRow {
  id: string;
  skill_id: string;
  git_sha: string;
  tag: string;
  scanned_at: string;
  status: string;
}

export interface GraphEdgeRow {
  id: string;
  source_skill_id: string;
  target_skill_id: string;
  edge_type: string;
  created_at: string;
}

export function generateId(): string {
  return nanoid(12);
}

/**
 * Calculate ranking score from individual scores + stars
 */
export function calculateRankingScore(score: {
  usefulness: number;
  documentation: number;
  maintenance: number;
  uniqueness: number;
}, stars: number): number {
  const avgScore = (score.usefulness * 0.35 + score.documentation * 0.2 + score.maintenance * 0.25 + score.uniqueness * 0.2);
  const starBonus = Math.min(Math.log10(stars + 1) * 0.5, 2); // Max 2 bonus from stars
  return Math.round((avgScore + starBonus) * 100) / 100;
}

/**
 * Insert or update a skill after successful scan
 */
export async function upsertSkill(
  db: D1Database,
  data: {
    git_url: string;
    name: string;
    summary: string;
    deep_review: string;
    category: string;
    use_cases: string[];
    when_to_use: string;
    how_to_use: string;
    platforms: string[];
    setup_complexity: string;
    requires: string[];
    highlights: string[];
    score: { usefulness: number; documentation: number; maintenance: number; uniqueness: number };
    github_stars: number;
  }
): Promise<string> {
  const ranking = calculateRankingScore(data.score, data.github_stars);

  // Check if skill already exists
  const existing = await db
    .prepare("SELECT id FROM skills WHERE git_url = ?")
    .bind(data.git_url)
    .first<{ id: string }>();

  if (existing) {
    // Update mutable fields
    await db
      .prepare(
        `UPDATE skills SET name = ?, summary = ?, deep_review = ?, category = ?,
         use_cases = ?, when_to_use = ?, how_to_use = ?, platforms = ?,
         setup_complexity = ?, requires = ?, highlights = ?, score_json = ?,
         github_stars = ?, ranking_score = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        data.name, data.summary, data.deep_review, data.category,
        JSON.stringify(data.use_cases), data.when_to_use, data.how_to_use,
        JSON.stringify(data.platforms), data.setup_complexity,
        JSON.stringify(data.requires), JSON.stringify(data.highlights),
        JSON.stringify(data.score), data.github_stars, ranking,
        existing.id
      )
      .run();
    return existing.id;
  }

  // Insert new skill
  const id = generateId();
  await db
    .prepare(
      `INSERT INTO skills (id, git_url, name, summary, deep_review, category,
       use_cases, when_to_use, how_to_use, platforms, setup_complexity,
       requires, highlights, score_json, github_stars, ranking_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, data.git_url, data.name, data.summary, data.deep_review, data.category,
      JSON.stringify(data.use_cases), data.when_to_use, data.how_to_use,
      JSON.stringify(data.platforms), data.setup_complexity,
      JSON.stringify(data.requires), JSON.stringify(data.highlights),
      JSON.stringify(data.score), data.github_stars, ranking
    )
    .run();

  return id;
}

/**
 * Insert a version record (immutable safety data)
 */
export async function insertVersion(
  db: D1Database,
  skillId: string,
  sha: string,
  tag: string,
  status: "pass" | "fail"
): Promise<string> {
  const id = generateId();
  await db
    .prepare(
      "INSERT INTO versions (id, skill_id, git_sha, tag, status) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(id, skillId, sha, tag, status)
    .run();
  return id;
}

/**
 * Insert a scan log entry
 */
export async function insertScanLog(
  db: D1Database,
  versionId: string,
  scanner: string,
  resultJson: string
): Promise<void> {
  const id = generateId();
  await db
    .prepare(
      "INSERT INTO scan_logs (id, version_id, scanner, result_json) VALUES (?, ?, ?, ?)"
    )
    .bind(id, versionId, scanner, resultJson)
    .run();
}

/**
 * Insert graph edges from LLM-extracted relationships.
 * Batch-resolves target names and uses db.batch() for inserts.
 */
export async function insertGraphEdges(
  db: D1Database,
  sourceSkillId: string,
  similar_to: string[],
  extends_skills: string[],
  depends_on: string[]
): Promise<void> {
  const edges: Array<{ target: string; type: string }> = [
    ...similar_to.map((t) => ({ target: t, type: "similar_to" })),
    ...extends_skills.map((t) => ({ target: t, type: "extends" })),
    ...depends_on.map((t) => ({ target: t, type: "depends_on" })),
  ];

  if (edges.length === 0) return;

  // Batch-resolve all target names in one query
  const uniqueTargets = [...new Set(edges.map((e) => e.target))];
  const placeholders = uniqueTargets.map(() => "(name = ? OR git_url LIKE ?)").join(" OR ");
  const resolveParams = uniqueTargets.flatMap((t) => [t, `%${t}%`]);

  const resolved = await db
    .prepare(`SELECT id, name, git_url FROM skills WHERE ${placeholders}`)
    .bind(...resolveParams)
    .all<{ id: string; name: string; git_url: string }>();

  // Build lookup map
  const targetMap = new Map<string, string>();
  for (const row of resolved.results || []) {
    for (const t of uniqueTargets) {
      if (row.name === t || row.git_url.includes(t)) {
        targetMap.set(t, row.id);
      }
    }
  }

  // Batch insert all edges
  const stmts = edges.map((edge) => {
    const targetId = targetMap.get(edge.target) || edge.target;
    const id = generateId();
    return db
      .prepare(
        "INSERT OR IGNORE INTO graph_edges (id, source_skill_id, target_skill_id, edge_type) VALUES (?, ?, ?, ?)"
      )
      .bind(id, sourceSkillId, targetId, edge.type);
  });

  await db.batch(stmts);
}

/**
 * Shared paginated skill query with filters.
 * Runs count and data queries in parallel (Fix 10).
 */
export async function querySkills(
  db: D1Database,
  params: {
    page: number;
    limit: number;
    category?: string;
    platform?: string;
    sort?: string;
    query?: string;
  }
): Promise<{ rows: Record<string, unknown>[]; total: number; page: number; totalPages: number }> {
  const { page, limit, category, platform, sort, query } = params;

  const conditions: string[] = [];
  const bindParams: unknown[] = [];

  if (category) {
    conditions.push("category = ?");
    bindParams.push(category);
  }
  if (platform) {
    conditions.push("platforms LIKE ?");
    bindParams.push(`%${platform}%`);
  }
  if (query) {
    conditions.push("(name LIKE ? OR summary LIKE ?)");
    bindParams.push(`%${query}%`, `%${query}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const validSorts: Record<string, string> = {
    ranking_score: "ranking_score DESC",
    stars: "github_stars DESC",
    newest: "created_at DESC",
    usefulness: "ranking_score DESC",
  };
  const orderBy = validSorts[sort || "ranking_score"] || validSorts.ranking_score;

  const offset = (page - 1) * limit;

  // Run count + data in parallel
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM skills ${whereClause}`);
  const boundCount = bindParams.length > 0 ? countStmt.bind(...bindParams) : countStmt;

  const dataStmt = db.prepare(
    `SELECT * FROM skills ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  );
  const dataBindParams = [...bindParams, limit, offset];
  const boundData = dataBindParams.length > 0 ? dataStmt.bind(...dataBindParams) : dataStmt;

  const [countResult, dataResult] = await Promise.all([
    boundCount.first<{ total: number }>(),
    boundData.all(),
  ]);

  const total = countResult?.total || 0;
  const rows = (dataResult.results || []) as Record<string, unknown>[];

  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}
