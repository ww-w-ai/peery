import { jsx, jsxs } from "react/jsx-runtime";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, NavLink, useLoaderData, Link, useSearchParams, useActionData, useNavigation, Form } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { nanoid } from "nanoid";
import { useState } from "react";
async function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
  const body = await renderToReadableStream(
    /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );
  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }
  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const stylesheet = "/assets/tailwind-QdHirxJA.css";
const links = () => [{
  rel: "stylesheet",
  href: stylesheet
}];
const root = UNSAFE_withComponentProps(function Root() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    className: "h-full",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      className: "h-full bg-gray-50 text-gray-900 antialiased",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex min-h-full flex-col",
        children: [/* @__PURE__ */ jsx(Header, {}), /* @__PURE__ */ jsx("main", {
          className: "flex-1",
          children: /* @__PURE__ */ jsx(Outlet, {})
        }), /* @__PURE__ */ jsx(Footer, {})]
      }), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
function Header() {
  const linkClass = ({
    isActive
  }) => `text-sm font-medium transition-colors ${isActive ? "text-emerald-700" : "text-gray-600 hover:text-gray-900"}`;
  return /* @__PURE__ */ jsx("header", {
    className: "border-b border-gray-200 bg-white",
    children: /* @__PURE__ */ jsxs("div", {
      className: "mx-auto flex h-16 max-w-6xl items-center justify-between px-4",
      children: [/* @__PURE__ */ jsxs(NavLink, {
        to: "/",
        className: "flex items-center gap-2 text-lg font-bold text-gray-900",
        children: [/* @__PURE__ */ jsx("span", {
          className: "text-2xl",
          "aria-hidden": "true",
          children: "🐯"
        }), /* @__PURE__ */ jsx("span", {
          children: "Peery"
        })]
      }), /* @__PURE__ */ jsxs("nav", {
        className: "flex items-center gap-6",
        children: [/* @__PURE__ */ jsx(NavLink, {
          to: "/",
          className: linkClass,
          end: true,
          children: "Home"
        }), /* @__PURE__ */ jsx(NavLink, {
          to: "/skills",
          className: linkClass,
          children: "Skills"
        }), /* @__PURE__ */ jsx(NavLink, {
          to: "/submit",
          className: linkClass,
          children: "Submit"
        }), /* @__PURE__ */ jsx(NavLink, {
          to: "/about",
          className: linkClass,
          children: "About"
        })]
      })]
    })
  });
}
function Footer() {
  return /* @__PURE__ */ jsx("footer", {
    className: "border-t border-gray-200 bg-white",
    children: /* @__PURE__ */ jsxs("div", {
      className: "mx-auto max-w-6xl px-4 py-6",
      children: [/* @__PURE__ */ jsx("p", {
        className: "text-center text-xs text-gray-500",
        children: "Verifications use AI-assisted analysis. Results are automated opinion, not certification."
      }), /* @__PURE__ */ jsxs("div", {
        className: "mt-2 flex justify-center gap-4",
        children: [/* @__PURE__ */ jsx("a", {
          href: "/terms",
          className: "text-xs text-gray-400 hover:text-gray-600",
          children: "Terms"
        }), /* @__PURE__ */ jsx("a", {
          href: "/privacy",
          className: "text-xs text-gray-400 hover:text-gray-600",
          children: "Privacy"
        })]
      })]
    })
  });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root,
  links
}, Symbol.toStringTag, { value: "Module" }));
const VERIFY_TTL = 86400 * 30;
const BADGE_TTL = 3600;
const RATE_LIMIT_TTL = 86400;
function verifyCacheKey(url, sha) {
  return sha ? `verify:${url}:${sha}` : `verify:${url}:latest`;
}
async function getCachedVerification(kv, url, sha) {
  const key = verifyCacheKey(url, sha);
  const cached = await kv.get(key, "json");
  return cached;
}
async function setCachedVerification(kv, url, entry2) {
  const keyExact = verifyCacheKey(url, entry2.sha);
  await kv.put(keyExact, JSON.stringify(entry2), { expirationTtl: VERIFY_TTL });
  const keyLatest = verifyCacheKey(url);
  await kv.put(keyLatest, JSON.stringify(entry2), { expirationTtl: VERIFY_TTL });
}
async function getCachedBadge(kv, skillId) {
  return await kv.get(`badge:${skillId}`);
}
async function setCachedBadge(kv, skillId, svg) {
  await kv.put(`badge:${skillId}`, svg, { expirationTtl: BADGE_TTL });
}
async function checkRateLimit(kv, ip, maxPerDay = 5) {
  const key = `ratelimit:${ip}:${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
  const current = await kv.get(key, "text");
  const count = current ? parseInt(current, 10) : 0;
  if (count >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
  return { allowed: true, remaining: maxPerDay - count - 1 };
}
function renderBadgeSvg(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20" role="img" aria-label="${label === "verified" ? "Verified by Peery" : "Not verified"}">
  <title>${label === "verified" ? "Verified by Peery" : "Not verified by Peery"}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="180" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="90" height="20" fill="#555"/>
    <rect x="90" width="90" height="20" fill="${color}"/>
    <rect width="180" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="45" y="14" fill="#010101" fill-opacity=".3">peery</text>
    <text x="45" y="13">peery</text>
    <text x="135" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="135" y="13">${label}</text>
  </g>
</svg>`;
}
async function loader$6({
  params,
  context
}) {
  const env = context.cloudflare.env;
  const skillId = params.id;
  if (!skillId) {
    return svgResponse(renderBadgeSvg("not verified", "#9f9f9f"));
  }
  const cached = await getCachedBadge(env.KV, skillId);
  if (cached) {
    return svgResponse(cached);
  }
  const version = await env.DB.prepare("SELECT id FROM versions WHERE skill_id = ? AND status = 'pass' LIMIT 1").bind(skillId).first();
  const svg = version ? renderBadgeSvg("verified", "#4c1") : renderBadgeSvg("not verified", "#9f9f9f");
  await setCachedBadge(env.KV, skillId, svg);
  return svgResponse(svg);
}
function svgResponse(svg) {
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function generateId() {
  return nanoid(12);
}
function calculateRankingScore(score, stars) {
  const avgScore = score.usefulness * 0.35 + score.documentation * 0.2 + score.maintenance * 0.25 + score.uniqueness * 0.2;
  const starBonus = Math.min(Math.log10(stars + 1) * 0.5, 2);
  return Math.round((avgScore + starBonus) * 100) / 100;
}
async function upsertSkill(db, data) {
  const ranking = calculateRankingScore(data.score, data.github_stars);
  const existing = await db.prepare("SELECT id FROM skills WHERE git_url = ?").bind(data.git_url).first();
  if (existing) {
    await db.prepare(
      `UPDATE skills SET name = ?, summary = ?, deep_review = ?, category = ?,
         use_cases = ?, when_to_use = ?, how_to_use = ?, platforms = ?,
         setup_complexity = ?, requires = ?, highlights = ?, score_json = ?,
         github_stars = ?, ranking_score = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(
      data.name,
      data.summary,
      data.deep_review,
      data.category,
      JSON.stringify(data.use_cases),
      data.when_to_use,
      data.how_to_use,
      JSON.stringify(data.platforms),
      data.setup_complexity,
      JSON.stringify(data.requires),
      JSON.stringify(data.highlights),
      JSON.stringify(data.score),
      data.github_stars,
      ranking,
      existing.id
    ).run();
    return existing.id;
  }
  const id = generateId();
  await db.prepare(
    `INSERT INTO skills (id, git_url, name, summary, deep_review, category,
       use_cases, when_to_use, how_to_use, platforms, setup_complexity,
       requires, highlights, score_json, github_stars, ranking_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    data.git_url,
    data.name,
    data.summary,
    data.deep_review,
    data.category,
    JSON.stringify(data.use_cases),
    data.when_to_use,
    data.how_to_use,
    JSON.stringify(data.platforms),
    data.setup_complexity,
    JSON.stringify(data.requires),
    JSON.stringify(data.highlights),
    JSON.stringify(data.score),
    data.github_stars,
    ranking
  ).run();
  return id;
}
async function insertVersion(db, skillId, sha, tag, status) {
  const id = generateId();
  await db.prepare(
    "INSERT INTO versions (id, skill_id, git_sha, tag, status) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, skillId, sha, tag, status).run();
  return id;
}
async function insertScanLog(db, versionId, scanner, resultJson) {
  const id = generateId();
  await db.prepare(
    "INSERT INTO scan_logs (id, version_id, scanner, result_json) VALUES (?, ?, ?, ?)"
  ).bind(id, versionId, scanner, resultJson).run();
}
async function insertGraphEdges(db, sourceSkillId, similar_to, extends_skills, depends_on) {
  const edges = [
    ...similar_to.map((t) => ({ target: t, type: "similar_to" })),
    ...extends_skills.map((t) => ({ target: t, type: "extends" })),
    ...depends_on.map((t) => ({ target: t, type: "depends_on" }))
  ];
  if (edges.length === 0) return;
  const uniqueTargets = [...new Set(edges.map((e) => e.target))];
  const placeholders = uniqueTargets.map(() => "(name = ? OR git_url LIKE ?)").join(" OR ");
  const resolveParams = uniqueTargets.flatMap((t) => [t, `%${t}%`]);
  const resolved = await db.prepare(`SELECT id, name, git_url FROM skills WHERE ${placeholders}`).bind(...resolveParams).all();
  const targetMap = /* @__PURE__ */ new Map();
  for (const row of resolved.results || []) {
    for (const t of uniqueTargets) {
      if (row.name === t || row.git_url.includes(t)) {
        targetMap.set(t, row.id);
      }
    }
  }
  const stmts = edges.map((edge) => {
    const targetId = targetMap.get(edge.target) || edge.target;
    const id = generateId();
    return db.prepare(
      "INSERT OR IGNORE INTO graph_edges (id, source_skill_id, target_skill_id, edge_type) VALUES (?, ?, ?, ?)"
    ).bind(id, sourceSkillId, targetId, edge.type);
  });
  await db.batch(stmts);
}
async function querySkills(db, params) {
  const { page, limit, category, platform, sort, query } = params;
  const conditions = [];
  const bindParams = [];
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
  const validSorts = {
    ranking_score: "ranking_score DESC",
    stars: "github_stars DESC",
    newest: "created_at DESC",
    usefulness: "ranking_score DESC"
  };
  const orderBy = validSorts[sort || "ranking_score"] || validSorts.ranking_score;
  const offset = (page - 1) * limit;
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM skills ${whereClause}`);
  const boundCount = bindParams.length > 0 ? countStmt.bind(...bindParams) : countStmt;
  const dataStmt = db.prepare(
    `SELECT * FROM skills ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  );
  const dataBindParams = [...bindParams, limit, offset];
  const boundData = dataBindParams.length > 0 ? dataStmt.bind(...dataBindParams) : dataStmt;
  const [countResult, dataResult] = await Promise.all([
    boundCount.first(),
    boundData.all()
  ]);
  const total = (countResult == null ? void 0 : countResult.total) || 0;
  const rows = dataResult.results || [];
  return { rows, total, page, totalPages: Math.ceil(total / limit) };
}
function isValidGitHubUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2;
  } catch {
    return false;
  }
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
function errorResponse(code, message, status, details) {
  return jsonResponse(
    { error: { code, message, details: details || {} } },
    status
  );
}
function parseJsonField(field) {
  if (!field) return [];
  try {
    return JSON.parse(field);
  } catch {
    return [];
  }
}
function formatSkillForApi(row) {
  return {
    id: row.id,
    git_url: row.git_url,
    name: row.name,
    summary: row.summary,
    deep_review: row.deep_review,
    category: row.category,
    use_cases: parseJsonField(row.use_cases),
    when_to_use: row.when_to_use,
    how_to_use: row.how_to_use,
    platforms: parseJsonField(row.platforms),
    setup_complexity: row.setup_complexity,
    requires: parseJsonField(row.requires),
    highlights: parseJsonField(row.highlights),
    score: parseJsonField(row.score_json),
    github_stars: row.github_stars,
    ranking_score: row.ranking_score,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
async function action$2({
  request,
  context
}) {
  const env = context.cloudflare.env;
  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is accepted", 405);
  }
  const secret = request.headers.get("X-Peery-Secret");
  if (!secret || secret !== env.PEERY_CALLBACK_SECRET) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing X-Peery-Secret header", 401);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be valid JSON", 400);
  }
  const {
    git_url,
    git_sha,
    tag,
    safe,
    metadata,
    scan_logs
  } = payload;
  if (!git_url || !git_sha) {
    return errorResponse("MISSING_FIELDS", "git_url and git_sha are required", 400);
  }
  const status = safe ? "pass" : "fail";
  let skillId;
  if (safe && metadata) {
    skillId = await upsertSkill(env.DB, {
      git_url,
      name: metadata.name || "Unknown",
      summary: metadata.summary || "",
      deep_review: metadata.deep_review || "",
      category: metadata.category || "other",
      use_cases: metadata.use_cases || [],
      when_to_use: metadata.when_to_use || "",
      how_to_use: metadata.how_to_use || "",
      platforms: metadata.platforms || [],
      setup_complexity: metadata.setup_complexity || "medium",
      requires: metadata.requires || [],
      highlights: metadata.highlights || [],
      score: metadata.score || {
        usefulness: 5,
        documentation: 5,
        maintenance: 5,
        uniqueness: 5
      },
      github_stars: 0
      // Will be updated by separate process
    });
    await insertGraphEdges(env.DB, skillId, metadata.similar_to || [], metadata.extends || [], metadata.depends_on || []);
  } else {
    const existing = await env.DB.prepare("SELECT id FROM skills WHERE git_url = ?").bind(git_url).first();
    if (existing) {
      skillId = existing.id;
    } else {
      skillId = await upsertSkill(env.DB, {
        git_url,
        name: (metadata == null ? void 0 : metadata.name) || "Unknown",
        summary: (metadata == null ? void 0 : metadata.summary) || "Scan failed",
        deep_review: "",
        category: "other",
        use_cases: [],
        when_to_use: "",
        how_to_use: "",
        platforms: [],
        setup_complexity: "medium",
        requires: [],
        highlights: [],
        score: {
          usefulness: 0,
          documentation: 0,
          maintenance: 0,
          uniqueness: 0
        },
        github_stars: 0
      });
    }
  }
  const versionId = await insertVersion(env.DB, skillId, git_sha, tag || "", status);
  if (scan_logs && Array.isArray(scan_logs)) {
    for (const log of scan_logs) {
      await insertScanLog(env.DB, versionId, log.scanner, JSON.stringify(log.result));
    }
  }
  if (safe) {
    await setCachedVerification(env.KV, git_url, {
      verified: true,
      skill_id: skillId,
      scanned_at: (/* @__PURE__ */ new Date()).toISOString(),
      sha: git_sha,
      tag: tag || ""
    });
  }
  return jsonResponse({
    skill_id: skillId,
    version_id: versionId,
    status
  });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2
}, Symbol.toStringTag, { value: "Module" }));
async function loader$5({
  request,
  context
}) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const result = await querySkills(env.DB, {
    page,
    limit,
    category: url.searchParams.get("category") || void 0,
    platform: url.searchParams.get("platform") || void 0,
    sort: url.searchParams.get("sort") || "ranking_score",
    query: url.searchParams.get("q") || void 0
  });
  const skills2 = result.rows.map(formatSkillForApi);
  return jsonResponse({
    data: skills2.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
      category: s.category,
      platforms: s.platforms,
      score: s.score,
      github_stars: s.github_stars,
      ranking_score: s.ranking_score
    })),
    pagination: {
      page: result.page,
      limit,
      total: result.total,
      pages: result.totalPages
    }
  });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4({
  params,
  context
}) {
  const env = context.cloudflare.env;
  const skillId = params.id;
  if (!skillId) {
    return errorResponse("MISSING_ID", "Skill ID is required", 400);
  }
  const [skill, versionsResult, edgesResult] = await Promise.all([env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(skillId).first(), env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? ORDER BY scanned_at DESC").bind(skillId).all(), env.DB.prepare(`SELECT ge.*, s.name as target_name FROM graph_edges ge
       LEFT JOIN skills s ON s.id = ge.target_skill_id
       WHERE ge.source_skill_id = ?`).bind(skillId).all()]);
  if (!skill) {
    return errorResponse("NOT_FOUND", "Skill not found", 404);
  }
  const formatted = formatSkillForApi(skill);
  return jsonResponse({
    data: {
      ...formatted,
      versions: (versionsResult.results || []).map((v) => ({
        id: v.id,
        git_sha: v.git_sha,
        tag: v.tag,
        scanned_at: v.scanned_at,
        status: v.status
      })),
      edges: (edgesResult.results || []).map((e) => ({
        type: e.edge_type,
        target_id: e.target_skill_id,
        target_name: e.target_name || e.target_skill_id
      }))
    }
  });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function action$1({
  request,
  context
}) {
  const env = context.cloudflare.env;
  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is accepted", 405);
  }
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const {
    allowed,
    remaining
  } = await checkRateLimit(env.KV, ip);
  if (!allowed) {
    return errorResponse("RATE_LIMITED", "Maximum 5 submissions per day. Try again tomorrow.", 429, {
      remaining: 0,
      reset_at: getNextMidnight()
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be valid JSON", 400);
  }
  const {
    git_url,
    tag
  } = body;
  if (!git_url) {
    return errorResponse("INVALID_URL", "Field 'git_url' is required", 400);
  }
  if (!isValidGitHubUrl(git_url)) {
    return errorResponse("INVALID_URL", "Must be a valid GitHub URL (github.com/owner/repo)", 400);
  }
  const jobId = generateId();
  try {
    const message = {
      job_id: jobId,
      git_url,
      tag: tag || "",
      submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
      callback_url: `${new URL(request.url).origin}/api/callback`
    };
    await env.SCAN_QUEUE.send(message);
  } catch (err) {
    console.error("Queue send failed:", err);
  }
  return jsonResponse({
    message: "Scan queued",
    job_id: jobId,
    remaining_submissions: remaining
  }, 202);
}
function getNextMidnight() {
  const now = /* @__PURE__ */ new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3({
  request,
  context
}) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const gitUrl = url.searchParams.get("url");
  const sha = url.searchParams.get("sha") || void 0;
  if (!gitUrl) {
    return errorResponse("MISSING_URL", "Query parameter 'url' is required", 400);
  }
  if (!isValidGitHubUrl(gitUrl)) {
    return errorResponse("INVALID_URL", "Must be a valid GitHub URL", 400);
  }
  const cached = await getCachedVerification(env.KV, gitUrl, sha);
  if (cached) {
    return jsonResponse({
      verified: cached.verified,
      version: {
        sha: cached.sha,
        tag: cached.tag || null,
        scanned_at: cached.scanned_at
      },
      skill_id: cached.skill_id
    });
  }
  const skill = await env.DB.prepare("SELECT id FROM skills WHERE git_url = ?").bind(gitUrl).first();
  if (!skill) {
    return jsonResponse({
      verified: false,
      reason: "not_found"
    }, 404);
  }
  const version = sha ? await env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? AND git_sha = ? AND status = 'pass'").bind(skill.id, sha).first() : await env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? AND status = 'pass' ORDER BY scanned_at DESC LIMIT 1").bind(skill.id).first();
  if (!version) {
    return jsonResponse({
      verified: false,
      reason: "no_passing_version"
    }, 404);
  }
  await setCachedVerification(env.KV, gitUrl, {
    verified: true,
    skill_id: skill.id,
    sha: version.git_sha,
    tag: version.tag || "",
    scanned_at: version.scanned_at
  });
  return jsonResponse({
    verified: true,
    version: {
      sha: version.git_sha,
      tag: version.tag || null,
      scanned_at: version.scanned_at
    },
    skill_id: skill.id
  });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const meta$2 = () => {
  return [{
    title: "Privacy Policy | Peery"
  }, {
    name: "description",
    content: "Peery Privacy Policy"
  }];
};
const privacy = UNSAFE_withComponentProps(function Privacy() {
  return /* @__PURE__ */ jsxs("div", {
    className: "max-w-3xl mx-auto px-6 py-16",
    children: [/* @__PURE__ */ jsx("h1", {
      className: "text-3xl font-bold mb-8",
      children: "Privacy Policy"
    }), /* @__PURE__ */ jsx("p", {
      className: "text-sm text-zinc-500 mb-8",
      children: "Last updated: 2025-05-10"
    }), /* @__PURE__ */ jsxs("div", {
      className: "space-y-6 text-zinc-700 leading-relaxed",
      children: [/* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "1. What We Analyze"
        }), /* @__PURE__ */ jsx("p", {
          children: "Peery analyzes publicly available open-source code hosted on platforms like GitHub. We only process code that is already publicly accessible."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "2. Data We Collect"
        }), /* @__PURE__ */ jsx("p", {
          children: "We collect minimal data: the Git URLs submitted for verification and the resulting scan reports. We do not collect personal information beyond what is necessary to process a submission."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "3. No Cookies (Phase 1)"
        }), /* @__PURE__ */ jsx("p", {
          children: "In our current phase, we do not use cookies or tracking technologies. This may change in future phases, at which point this policy will be updated."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "4. No PII Storage"
        }), /* @__PURE__ */ jsx("p", {
          children: "We do not store personally identifiable information. Submitted URLs are associated with scan results but not linked to individual users."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "5. Legal Basis (GDPR)"
        }), /* @__PURE__ */ jsx("p", {
          children: "Our legal basis for processing is legitimate interest in security verification of publicly available open-source software. This serves the broader community interest in software safety."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "6. Your Rights"
        }), /* @__PURE__ */ jsxs("p", {
          children: ["You have the right to request deletion of any data associated with your submissions. Contact us at ", /* @__PURE__ */ jsx("a", {
            href: "mailto:privacy@peery.ai",
            className: "text-blue-600 underline",
            children: "privacy@peery.ai"
          }), " to exercise this right."]
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "7. Data Retention"
        }), /* @__PURE__ */ jsx("p", {
          children: "Scan results are retained indefinitely as part of the public verification registry. Submission metadata may be purged after 90 days."
        })]
      })]
    })]
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: privacy,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const CATEGORIES = [
  "code-generation",
  "debugging",
  "testing",
  "documentation",
  "devops",
  "data-analysis",
  "writing",
  "design",
  "security",
  "productivity",
  "research",
  "infrastructure",
  "ai-agents",
  "communication",
  "education"
];
const PLATFORMS = [
  "claude-code",
  "chatgpt",
  "cursor",
  "windsurf",
  "copilot",
  "generic"
];
async function loader$2({
  context
}) {
  const env = context.cloudflare.env;
  const result = await env.DB.prepare("SELECT id, name, summary, category, platforms, ranking_score, github_stars, created_at FROM skills ORDER BY created_at DESC LIMIT 10").all();
  const skills2 = (result.results || []).map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
    category: row.category,
    platforms: parseJsonField(row.platforms),
    ranking_score: row.ranking_score,
    github_stars: row.github_stars,
    created_at: row.created_at
  }));
  return {
    skills: skills2
  };
}
const _index = UNSAFE_withComponentProps(function HomePage() {
  const {
    skills: skills2
  } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("section", {
      className: "bg-white py-16",
      children: /* @__PURE__ */ jsxs("div", {
        className: "mx-auto max-w-6xl px-4 text-center",
        children: [/* @__PURE__ */ jsx("h1", {
          className: "text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl",
          children: "Find safe, verified agent skills"
        }), /* @__PURE__ */ jsx("p", {
          className: "mt-4 text-lg text-gray-600",
          children: "Security-scanned AI agents and skills you can trust in production."
        }), /* @__PURE__ */ jsx("form", {
          action: "/skills",
          method: "get",
          className: "mt-8 flex justify-center",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex w-full max-w-lg",
            children: [/* @__PURE__ */ jsx("input", {
              type: "text",
              name: "q",
              placeholder: "Search skills...",
              className: "flex-1 rounded-l-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            }), /* @__PURE__ */ jsx("button", {
              type: "submit",
              className: "rounded-r-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors",
              children: "Search"
            })]
          })
        })]
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "border-y border-gray-200 bg-gray-50 py-10",
      children: /* @__PURE__ */ jsxs("div", {
        className: "mx-auto grid max-w-4xl grid-cols-3 gap-8 px-4 text-center",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("p", {
            className: "text-3xl font-bold text-emerald-700",
            children: "200+"
          }), /* @__PURE__ */ jsx("p", {
            className: "mt-1 text-sm text-gray-600",
            children: "Verified skills"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("p", {
            className: "text-3xl font-bold text-emerald-700",
            children: "15"
          }), /* @__PURE__ */ jsx("p", {
            className: "mt-1 text-sm text-gray-600",
            children: "Categories"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("p", {
            className: "text-3xl font-bold text-emerald-700",
            children: "10+"
          }), /* @__PURE__ */ jsx("p", {
            className: "mt-1 text-sm text-gray-600",
            children: "Platforms"
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "py-12",
      children: /* @__PURE__ */ jsxs("div", {
        className: "mx-auto max-w-6xl px-4",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-lg font-semibold text-gray-900",
          children: "Browse by category"
        }), /* @__PURE__ */ jsx("div", {
          className: "mt-4 flex flex-wrap gap-2",
          children: CATEGORIES.map((cat) => /* @__PURE__ */ jsx(Link, {
            to: `/skills?category=${cat}`,
            className: "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors",
            children: cat
          }, cat))
        })]
      })
    }), /* @__PURE__ */ jsx("section", {
      className: "pb-16",
      children: /* @__PURE__ */ jsxs("div", {
        className: "mx-auto max-w-6xl px-4",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-lg font-semibold text-gray-900",
          children: "Recent verifications"
        }), skills2.length === 0 ? /* @__PURE__ */ jsx("p", {
          className: "mt-4 text-sm text-gray-500",
          children: "No verified skills yet. Be the first to submit one."
        }) : /* @__PURE__ */ jsx("div", {
          className: "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          children: skills2.map((skill) => /* @__PURE__ */ jsx(SkillCard, {
            skill
          }, skill.id))
        })]
      })
    })]
  });
});
function SkillCard({
  skill
}) {
  return /* @__PURE__ */ jsxs(Link, {
    to: `/skills/${skill.id}`,
    className: "block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-start justify-between",
      children: [/* @__PURE__ */ jsx("h3", {
        className: "font-medium text-gray-900",
        children: skill.name
      }), /* @__PURE__ */ jsx("span", {
        className: "ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700",
        children: skill.ranking_score.toFixed(1)
      })]
    }), /* @__PURE__ */ jsx("p", {
      className: "mt-1 line-clamp-2 text-sm text-gray-600",
      children: skill.summary
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-3 flex items-center gap-2",
      children: [/* @__PURE__ */ jsx("span", {
        className: "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600",
        children: skill.category
      }), skill.github_stars > 0 && /* @__PURE__ */ jsxs("span", {
        className: "text-xs text-gray-500",
        children: [skill.github_stars, " stars"]
      })]
    })]
  });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _index,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
async function loader$1({
  request,
  context
}) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const result = await querySkills(env.DB, {
    page: Math.max(1, parseInt(url.searchParams.get("page") || "1", 10)),
    limit: 20,
    category: url.searchParams.get("category") || void 0,
    platform: url.searchParams.get("platform") || void 0,
    sort: url.searchParams.get("sort") || "ranking_score",
    query: url.searchParams.get("q") || void 0
  });
  const skills2 = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
    category: row.category,
    platforms: parseJsonField(row.platforms),
    score: parseJsonField(row.score_json),
    github_stars: row.github_stars,
    ranking_score: row.ranking_score
  }));
  return {
    skills: skills2,
    pagination: {
      page: result.page,
      limit: 20,
      total: result.total,
      pages: result.totalPages
    }
  };
}
const skills = UNSAFE_withComponentProps(function SkillsPage() {
  const {
    skills: skills2,
    pagination
  } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get("category") || "";
  const currentPlatform = searchParams.get("platform") || "";
  const currentSort = searchParams.get("sort") || "ranking_score";
  const currentQuery = searchParams.get("q") || "";
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    setSearchParams(next);
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "mx-auto max-w-6xl px-4 py-8",
    children: [/* @__PURE__ */ jsxs("form", {
      method: "get",
      className: "flex gap-2",
      children: [/* @__PURE__ */ jsx("input", {
        type: "text",
        name: "q",
        defaultValue: currentQuery,
        placeholder: "Search skills...",
        className: "flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      }), currentCategory && /* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "category",
        value: currentCategory
      }), currentPlatform && /* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "platform",
        value: currentPlatform
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        className: "rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors",
        children: "Search"
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-6 flex flex-wrap items-center gap-4",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex flex-wrap gap-1.5",
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => updateParam("category", ""),
          className: `rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${!currentCategory ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`,
          children: "All"
        }), CATEGORIES.map((cat) => /* @__PURE__ */ jsx("button", {
          onClick: () => updateParam("category", cat === currentCategory ? "" : cat),
          className: `rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${cat === currentCategory ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`,
          children: cat
        }, cat))]
      }), /* @__PURE__ */ jsxs("select", {
        value: currentPlatform,
        onChange: (e) => updateParam("platform", e.target.value),
        className: "rounded-lg border border-gray-300 px-3 py-1.5 text-xs",
        children: [/* @__PURE__ */ jsx("option", {
          value: "",
          children: "All platforms"
        }), PLATFORMS.map((p) => /* @__PURE__ */ jsx("option", {
          value: p,
          children: p
        }, p))]
      }), /* @__PURE__ */ jsxs("select", {
        value: currentSort,
        onChange: (e) => updateParam("sort", e.target.value),
        className: "rounded-lg border border-gray-300 px-3 py-1.5 text-xs",
        children: [/* @__PURE__ */ jsx("option", {
          value: "ranking_score",
          children: "Top ranked"
        }), /* @__PURE__ */ jsx("option", {
          value: "stars",
          children: "Most stars"
        }), /* @__PURE__ */ jsx("option", {
          value: "newest",
          children: "Newest"
        }), /* @__PURE__ */ jsx("option", {
          value: "usefulness",
          children: "Most useful"
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-6",
      children: [/* @__PURE__ */ jsxs("p", {
        className: "text-sm text-gray-500",
        children: [pagination.total, " skills found"]
      }), skills2.length === 0 ? /* @__PURE__ */ jsx("p", {
        className: "mt-8 text-center text-gray-500",
        children: "No skills match your filters."
      }) : /* @__PURE__ */ jsx("div", {
        className: "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        children: skills2.map((skill) => {
          var _a;
          return /* @__PURE__ */ jsxs(Link, {
            to: `/skills/${skill.id}`,
            className: "block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "flex items-start justify-between",
              children: [/* @__PURE__ */ jsx("h3", {
                className: "font-medium text-gray-900",
                children: skill.name
              }), /* @__PURE__ */ jsx("span", {
                className: "ml-2 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700",
                children: ((_a = skill.score) == null ? void 0 : _a.usefulness) ?? "–"
              })]
            }), /* @__PURE__ */ jsx("p", {
              className: "mt-1 line-clamp-2 text-sm text-gray-600",
              children: skill.summary
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-3 flex flex-wrap items-center gap-1.5",
              children: [/* @__PURE__ */ jsx("span", {
                className: "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600",
                children: skill.category
              }), skill.platforms.slice(0, 2).map((p) => /* @__PURE__ */ jsx("span", {
                className: "rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700",
                children: p
              }, p)), skill.github_stars > 0 && /* @__PURE__ */ jsxs("span", {
                className: "ml-auto text-xs text-gray-500",
                children: [skill.github_stars, " stars"]
              })]
            })]
          }, skill.id);
        })
      }), pagination.pages > 1 && /* @__PURE__ */ jsxs("div", {
        className: "mt-8 flex justify-center gap-2",
        children: [pagination.page > 1 && /* @__PURE__ */ jsx(Link, {
          to: `?${buildPageParams(searchParams, pagination.page - 1)}`,
          className: "rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50",
          children: "Previous"
        }), /* @__PURE__ */ jsxs("span", {
          className: "flex items-center px-3 text-sm text-gray-600",
          children: ["Page ", pagination.page, " of ", pagination.pages]
        }), pagination.page < pagination.pages && /* @__PURE__ */ jsx(Link, {
          to: `?${buildPageParams(searchParams, pagination.page + 1)}`,
          className: "rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50",
          children: "Next"
        })]
      })]
    })]
  });
});
function buildPageParams(current, page) {
  const next = new URLSearchParams(current);
  next.set("page", String(page));
  return next.toString();
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: skills,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader({
  params,
  context
}) {
  const env = context.cloudflare.env;
  const id = params.id;
  const [row, versionsResult, edgesResult] = await Promise.all([env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(id).first(), env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? ORDER BY scanned_at DESC").bind(id).all(), env.DB.prepare("SELECT target_skill_id, edge_type FROM graph_edges WHERE source_skill_id = ?").bind(id).all()]);
  if (!row) {
    throw new Response("Skill not found", {
      status: 404
    });
  }
  const skill = {
    id: row.id,
    git_url: row.git_url,
    name: row.name,
    summary: row.summary,
    deep_review: row.deep_review,
    category: row.category,
    use_cases: parseJsonField(row.use_cases),
    when_to_use: row.when_to_use,
    how_to_use: row.how_to_use,
    platforms: parseJsonField(row.platforms),
    setup_complexity: row.setup_complexity,
    requires: parseJsonField(row.requires),
    highlights: parseJsonField(row.highlights),
    score: parseJsonField(row.score_json),
    github_stars: row.github_stars,
    ranking_score: row.ranking_score,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  const versions = versionsResult.results || [];
  const edges = edgesResult.results || [];
  return {
    skill,
    versions,
    edges
  };
}
const skills_$id = UNSAFE_withComponentProps(function SkillDetailPage() {
  const {
    skill,
    versions,
    edges
  } = useLoaderData();
  const badgeMarkdown = `[![Verified by Peery](https://peery.ai/badge/${skill.id}.svg)](https://peery.ai/skills/${skill.id})`;
  const badgeHtml = `<a href="https://peery.ai/skills/${skill.id}"><img src="https://peery.ai/badge/${skill.id}.svg" alt="Verified by Peery" /></a>`;
  return /* @__PURE__ */ jsxs("div", {
    className: "mx-auto max-w-4xl px-4 py-8",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "flex items-start justify-between",
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h1", {
          className: "text-2xl font-bold text-gray-900",
          children: skill.name
        }), /* @__PURE__ */ jsx("p", {
          className: "mt-1 text-gray-600",
          children: skill.summary
        })]
      }), /* @__PURE__ */ jsxs("span", {
        className: "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800",
        children: [/* @__PURE__ */ jsx("svg", {
          className: "h-4 w-4",
          fill: "currentColor",
          viewBox: "0 0 20 20",
          children: /* @__PURE__ */ jsx("path", {
            fillRule: "evenodd",
            d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
            clipRule: "evenodd"
          })
        }), "Verified"]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-4 flex flex-wrap gap-2",
      children: [skill.platforms.map((p) => /* @__PURE__ */ jsx("span", {
        className: "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700",
        children: p
      }, p)), /* @__PURE__ */ jsx("span", {
        className: "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600",
        children: skill.category
      })]
    }), /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Score breakdown"
      }), /* @__PURE__ */ jsxs("div", {
        className: "mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4",
        children: [/* @__PURE__ */ jsx(ScoreCard, {
          label: "Usefulness",
          value: skill.score.usefulness
        }), /* @__PURE__ */ jsx(ScoreCard, {
          label: "Documentation",
          value: skill.score.documentation
        }), /* @__PURE__ */ jsx(ScoreCard, {
          label: "Maintenance",
          value: skill.score.maintenance
        }), /* @__PURE__ */ jsx(ScoreCard, {
          label: "Uniqueness",
          value: skill.score.uniqueness
        })]
      })]
    }), skill.highlights.length > 0 && /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Highlights"
      }), /* @__PURE__ */ jsx("ul", {
        className: "mt-3 space-y-2",
        children: skill.highlights.map((h, i) => /* @__PURE__ */ jsxs("li", {
          className: "flex items-start gap-2",
          children: [/* @__PURE__ */ jsx("span", {
            className: "mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
          }), /* @__PURE__ */ jsx("span", {
            className: "text-sm text-gray-700",
            children: h
          })]
        }, i))
      })]
    }), skill.deep_review && /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Deep review"
      }), /* @__PURE__ */ jsx("div", {
        className: "mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 leading-relaxed",
        children: skill.deep_review
      })]
    }), /* @__PURE__ */ jsxs("section", {
      className: "mt-8 grid gap-4 sm:grid-cols-2",
      children: [/* @__PURE__ */ jsx(MetaBlock, {
        title: "When to use",
        content: skill.when_to_use
      }), /* @__PURE__ */ jsx(MetaBlock, {
        title: "How to use",
        content: skill.how_to_use
      }), /* @__PURE__ */ jsx(MetaBlock, {
        title: "Setup complexity",
        content: skill.setup_complexity
      }), /* @__PURE__ */ jsx(MetaBlock, {
        title: "Requires",
        content: skill.requires.join(", ") || "None"
      })]
    }), versions.length > 0 && /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Version history"
      }), /* @__PURE__ */ jsx("div", {
        className: "mt-3 overflow-x-auto",
        children: /* @__PURE__ */ jsxs("table", {
          className: "w-full text-sm",
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsxs("tr", {
              className: "border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500",
              children: [/* @__PURE__ */ jsx("th", {
                className: "pb-2 pr-4",
                children: "Tag"
              }), /* @__PURE__ */ jsx("th", {
                className: "pb-2 pr-4",
                children: "SHA"
              }), /* @__PURE__ */ jsx("th", {
                className: "pb-2 pr-4",
                children: "Date"
              }), /* @__PURE__ */ jsx("th", {
                className: "pb-2",
                children: "Status"
              })]
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: versions.map((v) => /* @__PURE__ */ jsxs("tr", {
              className: "border-b border-gray-100",
              children: [/* @__PURE__ */ jsx("td", {
                className: "py-2 pr-4 font-mono text-xs",
                children: v.tag || "–"
              }), /* @__PURE__ */ jsx("td", {
                className: "py-2 pr-4 font-mono text-xs",
                children: v.git_sha.slice(0, 7)
              }), /* @__PURE__ */ jsx("td", {
                className: "py-2 pr-4 text-gray-600",
                children: v.scanned_at ? new Date(v.scanned_at).toLocaleDateString() : "–"
              }), /* @__PURE__ */ jsx("td", {
                className: "py-2",
                children: /* @__PURE__ */ jsx("span", {
                  className: `inline-block rounded-full px-2 py-0.5 text-xs font-medium ${v.status === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`,
                  children: v.status
                })
              })]
            }, v.id))
          })]
        })
      })]
    }), edges.length > 0 && /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Related skills"
      }), /* @__PURE__ */ jsx("div", {
        className: "mt-3 flex flex-wrap gap-2",
        children: edges.map((e, i) => /* @__PURE__ */ jsxs(Link, {
          to: `/skills/${e.target_skill_id}`,
          className: "inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors",
          children: [/* @__PURE__ */ jsxs("span", {
            className: "text-gray-400",
            children: [e.edge_type, ":"]
          }), /* @__PURE__ */ jsx("span", {
            children: e.target_name || e.target_skill_id
          })]
        }, i))
      })]
    }), /* @__PURE__ */ jsxs("section", {
      className: "mt-8",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "text-sm font-semibold uppercase tracking-wide text-gray-500",
        children: "Badge embed"
      }), /* @__PURE__ */ jsxs("div", {
        className: "mt-3 space-y-3",
        children: [/* @__PURE__ */ jsx(CopyBlock, {
          label: "Markdown",
          value: badgeMarkdown
        }), /* @__PURE__ */ jsx(CopyBlock, {
          label: "HTML",
          value: badgeHtml
        })]
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 border-t border-gray-200 pt-6",
      children: /* @__PURE__ */ jsxs("a", {
        href: skill.git_url,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800",
        children: ["View source repository", /* @__PURE__ */ jsx("svg", {
          className: "h-4 w-4",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          strokeWidth: 2,
          children: /* @__PURE__ */ jsx("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          })
        })]
      })
    })]
  });
});
function ScoreCard({
  label,
  value
}) {
  const percentage = value / 10 * 100;
  return /* @__PURE__ */ jsxs("div", {
    className: "rounded-lg border border-gray-200 bg-white p-3",
    children: [/* @__PURE__ */ jsx("p", {
      className: "text-xs text-gray-500",
      children: label
    }), /* @__PURE__ */ jsxs("p", {
      className: "mt-1 text-lg font-bold text-gray-900",
      children: [value, "/10"]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-2 h-1.5 w-full rounded-full bg-gray-100",
      children: /* @__PURE__ */ jsx("div", {
        className: "h-1.5 rounded-full bg-emerald-500",
        style: {
          width: `${percentage}%`
        }
      })
    })]
  });
}
function MetaBlock({
  title,
  content
}) {
  return /* @__PURE__ */ jsxs("div", {
    className: "rounded-lg border border-gray-200 bg-white p-4",
    children: [/* @__PURE__ */ jsx("p", {
      className: "text-xs font-medium uppercase text-gray-500",
      children: title
    }), /* @__PURE__ */ jsx("p", {
      className: "mt-1 text-sm text-gray-700",
      children: content || "–"
    })]
  });
}
function CopyBlock({
  label,
  value
}) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  }
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("p", {
      className: "text-xs font-medium text-gray-500",
      children: label
    }), /* @__PURE__ */ jsxs("div", {
      className: "mt-1 flex items-start gap-2",
      children: [/* @__PURE__ */ jsx("textarea", {
        readOnly: true,
        value,
        rows: 2,
        className: "flex-1 resize-none rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-700"
      }), /* @__PURE__ */ jsx("button", {
        onClick: handleCopy,
        className: "shrink-0 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors",
        children: copied ? "Copied" : "Copy"
      })]
    })]
  });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: skills_$id,
  loader
}, Symbol.toStringTag, { value: "Module" }));
async function action({
  request,
  context
}) {
  var _a, _b;
  const env = context.cloudflare.env;
  const formData = await request.formData();
  const gitUrl = ((_a = formData.get("git_url")) == null ? void 0 : _a.trim()) || "";
  const tag = ((_b = formData.get("tag")) == null ? void 0 : _b.trim()) || "";
  const errors = [];
  if (!gitUrl) {
    errors.push({
      field: "git_url",
      message: "Git URL is required."
    });
  } else if (!isValidGitHubUrl(gitUrl)) {
    errors.push({
      field: "git_url",
      message: "Must be a valid GitHub URL (github.com/owner/repo)."
    });
  }
  if (errors.length > 0) {
    return {
      errors
    };
  }
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const {
    allowed,
    remaining
  } = await checkRateLimit(env.KV, ip);
  if (!allowed) {
    errors.push({
      field: "git_url",
      message: "Rate limit reached. Maximum 5 submissions per day."
    });
    return {
      errors
    };
  }
  const jobId = generateId();
  try {
    const message = {
      job_id: jobId,
      git_url: gitUrl,
      tag: tag || "",
      submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
      callback_url: `${new URL(request.url).origin}/api/callback`
    };
    await env.SCAN_QUEUE.send(message);
  } catch (err) {
    console.error("Queue send failed:", err);
  }
  return {
    success: true,
    jobId,
    remaining
  };
}
const submit = UNSAFE_withComponentProps(function SubmitPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return /* @__PURE__ */ jsxs("div", {
    className: "mx-auto max-w-xl px-4 py-12",
    children: [/* @__PURE__ */ jsx("h1", {
      className: "text-2xl font-bold text-gray-900",
      children: "Submit a skill for verification"
    }), /* @__PURE__ */ jsx("p", {
      className: "mt-2 text-sm text-gray-600",
      children: "Provide a GitHub repository URL and we will run security scans against the source code."
    }), (actionData == null ? void 0 : actionData.success) ? /* @__PURE__ */ jsxs("div", {
      className: "mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6",
      children: [/* @__PURE__ */ jsx("h2", {
        className: "font-medium text-emerald-900",
        children: "Scan queued"
      }), /* @__PURE__ */ jsxs("p", {
        className: "mt-1 text-sm text-emerald-700",
        children: ["We will process this shortly. Job ID: ", /* @__PURE__ */ jsx("code", {
          className: "font-mono",
          children: actionData.jobId
        })]
      }), actionData.remaining !== void 0 && /* @__PURE__ */ jsxs("p", {
        className: "mt-2 text-xs text-emerald-600",
        children: [actionData.remaining, " submissions remaining today."]
      })]
    }) : /* @__PURE__ */ jsxs(Form, {
      method: "post",
      className: "mt-8 space-y-5",
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsxs("label", {
          htmlFor: "git_url",
          className: "block text-sm font-medium text-gray-700",
          children: ["GitHub URL ", /* @__PURE__ */ jsx("span", {
            className: "text-red-500",
            children: "*"
          })]
        }), /* @__PURE__ */ jsx("input", {
          type: "url",
          id: "git_url",
          name: "git_url",
          required: true,
          placeholder: "https://github.com/owner/repo",
          className: "mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        }), /* @__PURE__ */ jsx(FieldError, {
          errors: actionData == null ? void 0 : actionData.errors,
          field: "git_url"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsxs("label", {
          htmlFor: "tag",
          className: "block text-sm font-medium text-gray-700",
          children: ["Version tag ", /* @__PURE__ */ jsx("span", {
            className: "text-gray-400",
            children: "(optional)"
          })]
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          id: "tag",
          name: "tag",
          placeholder: "v1.0.0",
          className: "mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        })]
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        disabled: isSubmitting,
        className: "w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors",
        children: isSubmitting ? "Submitting..." : "Submit for verification"
      }), /* @__PURE__ */ jsx("p", {
        className: "text-xs text-gray-500",
        children: "Rate limit: 5 submissions per day per IP address."
      })]
    })]
  });
});
function FieldError({
  errors,
  field
}) {
  const error = errors == null ? void 0 : errors.find((e) => e.field === field);
  if (!error) return null;
  return /* @__PURE__ */ jsx("p", {
    className: "mt-1 text-xs text-red-600",
    children: error.message
  });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: submit
}, Symbol.toStringTag, { value: "Module" }));
const meta$1 = () => {
  return [{
    title: "About | Peery"
  }, {
    name: "description",
    content: "How Peery verifies AI agent and skill security"
  }];
};
const about = UNSAFE_withComponentProps(function About() {
  return /* @__PURE__ */ jsxs("div", {
    className: "max-w-3xl mx-auto px-6 py-16",
    children: [/* @__PURE__ */ jsx("h1", {
      className: "text-3xl font-bold mb-8",
      children: "About Peery"
    }), /* @__PURE__ */ jsxs("div", {
      className: "space-y-8 text-zinc-700 leading-relaxed",
      children: [/* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "What Peery Checks"
        }), /* @__PURE__ */ jsxs("ol", {
          className: "list-decimal list-inside space-y-2",
          children: [/* @__PURE__ */ jsxs("li", {
            children: [/* @__PURE__ */ jsx("span", {
              className: "font-medium",
              children: "Malicious patterns in source code"
            }), " — regex-based static analysis detects destructive commands, data exfiltration, secret theft, obfuscated code, and unauthorized file access."]
          }), /* @__PURE__ */ jsxs("li", {
            children: [/* @__PURE__ */ jsx("span", {
              className: "font-medium",
              children: "Malicious intent in instructions"
            }), " — LLM-based semantic analysis evaluates agent/skill instructions for hidden prompt injection, deceptive behavior, or harmful intent."]
          })]
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: 'What "Listed" Means'
        }), /* @__PURE__ */ jsx("p", {
          children: "A listed skill or agent has been safety-verified at a specific version (commit SHA). It passed both regex pattern matching and dual-LLM intent analysis at that point in time."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: 'What "Not Listed" Means'
        }), /* @__PURE__ */ jsxs("p", {
          children: ["A skill or agent that is not listed has simply not been reviewed yet. It does", " ", /* @__PURE__ */ jsx("span", {
            className: "font-semibold",
            children: "not"
          }), " mean it is unsafe. Absence of verification is not a negative signal."]
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "How It Works"
        }), /* @__PURE__ */ jsxs("ol", {
          className: "list-decimal list-inside space-y-2",
          children: [/* @__PURE__ */ jsx("li", {
            children: "Submit a public Git URL for verification."
          }), /* @__PURE__ */ jsx("li", {
            children: "Automated scanners analyze the source code for known malicious patterns."
          }), /* @__PURE__ */ jsx("li", {
            children: "Dual LLM cross-check (Gemini + DeepSeek) evaluates instructions and code for malicious intent independently."
          }), /* @__PURE__ */ jsx("li", {
            children: "If both automated scan and LLM analysis pass, the skill is listed as verified."
          })]
        })]
      }), /* @__PURE__ */ jsxs("section", {
        className: "bg-zinc-50 border border-zinc-200 rounded-lg p-5",
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-lg font-semibold mb-2 text-zinc-900",
          children: "AI Transparency Notice"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-sm",
          children: "Verifications use AI-assisted analysis (Gemini + DeepSeek). Results represent automated opinion, not certification. Two independent LLMs must agree for a skill to be listed, reducing single-model bias, but no automated system is infallible."
        })]
      })]
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: about,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => {
  return [{
    title: "Terms of Service | Peery"
  }, {
    name: "description",
    content: "Peery Terms of Service"
  }];
};
const terms = UNSAFE_withComponentProps(function Terms() {
  return /* @__PURE__ */ jsxs("div", {
    className: "max-w-3xl mx-auto px-6 py-16",
    children: [/* @__PURE__ */ jsx("h1", {
      className: "text-3xl font-bold mb-8",
      children: "Terms of Service"
    }), /* @__PURE__ */ jsx("p", {
      className: "text-sm text-zinc-500 mb-8",
      children: "Last updated: 2025-05-10"
    }), /* @__PURE__ */ jsxs("div", {
      className: "space-y-6 text-zinc-700 leading-relaxed",
      children: [/* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "1. Nature of Service"
        }), /* @__PURE__ */ jsx("p", {
          children: "Peery provides point-in-time automated security assessments of publicly available open-source AI agent and skill source code. Each verification reflects the state of the code at a specific commit SHA at the time of analysis."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "2. No Warranty"
        }), /* @__PURE__ */ jsx("p", {
          children: 'The service is provided "as is" without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. Use Peery results at your own risk.'
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: '3. What "Verified" Means'
        }), /* @__PURE__ */ jsx("p", {
          children: 'A "Verified" status means the code passed our automated security checks at the specified version. It does not constitute a certification, guarantee of safety, or endorsement. It is an automated assessment, not a professional audit.'
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "4. Results Are Opinion"
        }), /* @__PURE__ */ jsx("p", {
          children: "Verification results represent the automated opinion of our scanning systems, which include AI-assisted analysis. They should be considered one data point among many when evaluating software safety."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "5. Limitation of Liability"
        }), /* @__PURE__ */ jsx("p", {
          children: "To the maximum extent permitted by law, Peery and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of or reliance on the service. Total liability is capped at the amount you paid for the service in the 12 months preceding the claim."
        })]
      }), /* @__PURE__ */ jsxs("section", {
        children: [/* @__PURE__ */ jsx("h2", {
          className: "text-xl font-semibold mb-3 text-zinc-900",
          children: "6. Acceptable Use"
        }), /* @__PURE__ */ jsx("p", {
          children: "You may not use Peery to submit malicious URLs, overwhelm the service with automated requests beyond reasonable use, or misrepresent verification results."
        })]
      })]
    })]
  });
});
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: terms,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-KMdcb7Yt.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-Cf50zZhL.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/badge.$id[.svg]": { "id": "routes/badge.$id[.svg]", "parentId": "root", "path": "badge/:id.svg", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/badge._id_.svg_-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.callback": { "id": "routes/api.callback", "parentId": "root", "path": "api/callback", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.callback-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.skills": { "id": "routes/api.skills", "parentId": "root", "path": "api/skills", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.skills-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.skills.$id": { "id": "routes/api.skills.$id", "parentId": "routes/api.skills", "path": ":id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.skills._id-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.submit": { "id": "routes/api.submit", "parentId": "root", "path": "api/submit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.submit-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.verify": { "id": "routes/api.verify", "parentId": "root", "path": "api/verify", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.verify-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/privacy": { "id": "routes/privacy", "parentId": "root", "path": "privacy", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/privacy-BY-swTXv.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_index-7YZDJZAf.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js", "/assets/constants-DpoNCNM4.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/skills": { "id": "routes/skills", "parentId": "root", "path": "skills", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/skills-14uH1bb5.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js", "/assets/constants-DpoNCNM4.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/skills.$id": { "id": "routes/skills.$id", "parentId": "routes/skills", "path": ":id", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/skills._id-a2eIiwAk.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/submit": { "id": "routes/submit", "parentId": "root", "path": "submit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/submit-Bz3BGYYY.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/about": { "id": "routes/about", "parentId": "root", "path": "about", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/about-s8WxGMhS.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/terms": { "id": "routes/terms", "parentId": "root", "path": "terms", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/terms-CT7Kiz2S.js", "imports": ["/assets/chunk-5KNZJZUH-Do5h7rm6.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-9d3900f4.js", "version": "9d3900f4", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "v8_passThroughRequests": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/badge.$id[.svg]": {
    id: "routes/badge.$id[.svg]",
    parentId: "root",
    path: "badge/:id.svg",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/api.callback": {
    id: "routes/api.callback",
    parentId: "root",
    path: "api/callback",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/api.skills": {
    id: "routes/api.skills",
    parentId: "root",
    path: "api/skills",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.skills.$id": {
    id: "routes/api.skills.$id",
    parentId: "routes/api.skills",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/api.submit": {
    id: "routes/api.submit",
    parentId: "root",
    path: "api/submit",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/api.verify": {
    id: "routes/api.verify",
    parentId: "root",
    path: "api/verify",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/privacy": {
    id: "routes/privacy",
    parentId: "root",
    path: "privacy",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route8
  },
  "routes/skills": {
    id: "routes/skills",
    parentId: "root",
    path: "skills",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/skills.$id": {
    id: "routes/skills.$id",
    parentId: "routes/skills",
    path: ":id",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/submit": {
    id: "routes/submit",
    parentId: "root",
    path: "submit",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/about": {
    id: "routes/about",
    parentId: "root",
    path: "about",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/terms": {
    id: "routes/terms",
    parentId: "root",
    path: "terms",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
