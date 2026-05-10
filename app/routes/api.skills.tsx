/**
 * GET /api/skills — Paginated skill list with filters
 * Design Ref: §4.2 — GET /api/skills
 */

import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { querySkills } from "~/lib/db.server";
import { jsonResponse, formatSkillForApi } from "~/lib/utils";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

  const result = await querySkills(env.DB, {
    page,
    limit,
    category: url.searchParams.get("category") || undefined,
    platform: url.searchParams.get("platform") || undefined,
    sort: url.searchParams.get("sort") || "ranking_score",
    query: url.searchParams.get("q") || undefined,
  });

  const skills = result.rows.map(formatSkillForApi);

  return jsonResponse({
    data: skills.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
      categories: s.categories,
      platforms: s.platforms,
      score: s.score,
      github_stars: s.github_stars,
      ranking_score: s.ranking_score,
    })),
    pagination: {
      page: result.page,
      limit,
      total: result.total,
      pages: result.totalPages,
    },
  });
}
