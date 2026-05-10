import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { jsonResponse, errorResponse } from "~/lib/utils";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== env.PEERY_CALLBACK_SECRET) {
    return errorResponse("UNAUTHORIZED", "Invalid secret", 401);
  }

  const result = await env.DB.prepare(
    "SELECT id, git_url, name, reason, threats, flagged_at, reviewed, reviewer_note FROM flagged_skills ORDER BY flagged_at DESC"
  ).all();

  return jsonResponse({ flagged: result.results, total: result.results.length });
}
