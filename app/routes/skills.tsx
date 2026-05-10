import { Link, useLoaderData, useSearchParams } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { querySkills } from "~/lib/db.server";
import { parseJsonField } from "~/lib/utils";
import { CATEGORIES, PLATFORMS } from "~/lib/constants";

interface SkillItem {
  id: string;
  name: string;
  summary: string;
  category: string;
  platforms: string[];
  score: { usefulness: number; documentation: number; maintenance: number; uniqueness: number };
  github_stars: number;
  ranking_score: number;
}

interface LoaderData {
  skills: SkillItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);

  const result = await querySkills(env.DB, {
    page: Math.max(1, parseInt(url.searchParams.get("page") || "1", 10)),
    limit: 20,
    category: url.searchParams.get("category") || undefined,
    platform: url.searchParams.get("platform") || undefined,
    sort: url.searchParams.get("sort") || "ranking_score",
    query: url.searchParams.get("q") || undefined,
  });

  const skills: SkillItem[] = result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    summary: row.summary as string,
    category: row.category as string,
    platforms: parseJsonField(row.platforms as string),
    score: parseJsonField(row.score_json as string),
    github_stars: row.github_stars as number,
    ranking_score: row.ranking_score as number,
  }));

  return {
    skills,
    pagination: { page: result.page, limit: 20, total: result.total, pages: result.totalPages },
  } satisfies LoaderData;
}

export default function SkillsPage() {
  const { skills, pagination } = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCategory = searchParams.get("category") || "";
  const currentPlatform = searchParams.get("platform") || "";
  const currentSort = searchParams.get("sort") || "ranking_score";
  const currentQuery = searchParams.get("q") || "";

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search */}
      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={currentQuery}
          placeholder="Search skills..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
        {currentPlatform && <input type="hidden" name="platform" value={currentPlatform} />}
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filters row */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => updateParam("category", "")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${!currentCategory ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParam("category", cat === currentCategory ? "" : cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${cat === currentCategory ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Platform filter */}
        <select
          value={currentPlatform}
          onChange={(e) => updateParam("platform", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs"
        >
          <option value="ranking_score">Top ranked</option>
          <option value="stars">Most stars</option>
          <option value="newest">Newest</option>
          <option value="usefulness">Most useful</option>
        </select>
      </div>

      {/* Results */}
      <div className="mt-6">
        <p className="text-sm text-gray-500">{pagination.total} skills found</p>

        {skills.length === 0 ? (
          <p className="mt-8 text-center text-gray-500">No skills match your filters.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                to={`/skills/${skill.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">{skill.name}</h3>
                  <span className="ml-2 shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {skill.score?.usefulness ?? "–"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{skill.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {skill.category}
                  </span>
                  {skill.platforms.slice(0, 2).map((p) => (
                    <span key={p} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {p}
                    </span>
                  ))}
                  {skill.github_stars > 0 && (
                    <span className="ml-auto text-xs text-gray-500">{skill.github_stars} stars</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {pagination.page > 1 && (
              <Link
                to={`?${buildPageParams(searchParams, pagination.page - 1)}`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            <span className="flex items-center px-3 text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            {pagination.page < pagination.pages && (
              <Link
                to={`?${buildPageParams(searchParams, pagination.page + 1)}`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildPageParams(current: URLSearchParams, page: number): string {
  const next = new URLSearchParams(current);
  next.set("page", String(page));
  return next.toString();
}
