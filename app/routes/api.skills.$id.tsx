/**
 * GET /api/skills/:id — Skill detail with versions and graph edges
 * Design Ref: §4.2 — GET /api/skills/:id
 */

import type { LoaderFunctionArgs } from "react-router";
import type { Env, VersionRow, GraphEdgeRow } from "~/lib/db.server";
import { jsonResponse, errorResponse, formatSkillForApi } from "~/lib/utils";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const skillId = params.id;

  if (!skillId) {
    return errorResponse("MISSING_ID", "Skill ID is required", 400);
  }

  // Run all queries in parallel
  const [skill, versionsResult, edgesResult] = await Promise.all([
    env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(skillId).first(),
    env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? ORDER BY scanned_at DESC").bind(skillId).all<VersionRow>(),
    env.DB.prepare(
      `SELECT ge.*, s.name as target_name FROM graph_edges ge
       LEFT JOIN skills s ON s.id = ge.target_skill_id
       WHERE ge.source_skill_id = ?`
    ).bind(skillId).all(),
  ]);

  if (!skill) {
    return errorResponse("NOT_FOUND", "Skill not found", 404);
  }

  const formatted = formatSkillForApi(skill as unknown as Record<string, unknown>);

  return jsonResponse({
    data: {
      ...formatted,
      versions: (versionsResult.results || []).map((v) => ({
        id: v.id,
        git_sha: v.git_sha,
        tag: v.tag,
        scanned_at: v.scanned_at,
        status: v.status,
      })),
      edges: (edgesResult.results || []).map((e: Record<string, unknown>) => ({
        type: e.edge_type,
        target_id: e.target_skill_id,
        target_name: e.target_name || e.target_skill_id,
      })),
    },
  });
}
