/**
 * GET /badge/:id.svg — Dynamic badge SVG endpoint
 * Design Ref: §5.1 — Badge SVG Endpoint
 * Plan SC: Badge API returns valid SVG
 */

import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { getCachedBadge, setCachedBadge } from "~/lib/kv.server";

function renderBadgeSvg(label: string, color: string): string {
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

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const skillId = params.id;

  if (!skillId) {
    return svgResponse(renderBadgeSvg("not verified", "#9f9f9f"));
  }

  // Check KV cache first
  const cached = await getCachedBadge(env.KV, skillId);
  if (cached) {
    return svgResponse(cached);
  }

  // Check D1 for a passing version
  const version = await env.DB
    .prepare("SELECT id FROM versions WHERE skill_id = ? AND status = 'pass' LIMIT 1")
    .bind(skillId)
    .first();

  const svg = version ? renderBadgeSvg("verified", "#4c1") : renderBadgeSvg("not verified", "#9f9f9f");

  // Cache the result
  await setCachedBadge(env.KV, skillId, svg);

  return svgResponse(svg);
}

function svgResponse(svg: string): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
