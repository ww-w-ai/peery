import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { parseJsonField } from "~/lib/utils";
import { CATEGORIES } from "~/lib/constants";

interface SkillSummary {
  id: string;
  name: string;
  summary: string;
  category: string;
  platforms: string[];
  ranking_score: number;
  github_stars: number;
  created_at: string;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  const result = await env.DB.prepare(
    "SELECT id, name, summary, category, platforms, ranking_score, github_stars, created_at FROM skills ORDER BY created_at DESC LIMIT 10"
  ).all();

  const skills: SkillSummary[] = (result.results || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    summary: row.summary as string,
    category: row.category as string,
    platforms: parseJsonField(row.platforms as string),
    ranking_score: row.ranking_score as number,
    github_stars: row.github_stars as number,
    created_at: row.created_at as string,
  }));

  return { skills };
}

export default function HomePage() {
  const { skills } = useLoaderData<typeof loader>();

  return (
    <div>
      {/* Hero */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Find safe, verified agent skills
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Security-scanned AI agents and skills you can trust in production.
          </p>
          <form action="/skills" method="get" className="mt-8 flex justify-center">
            <div className="flex w-full max-w-lg">
              <input
                type="text"
                name="q"
                placeholder="Search skills..."
                className="flex-1 rounded-l-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="rounded-r-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-gray-50 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-8 px-4 text-center">
          <div>
            <p className="text-3xl font-bold text-emerald-700">200+</p>
            <p className="mt-1 text-sm text-gray-600">Verified skills</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-700">15</p>
            <p className="mt-1 text-sm text-gray-600">Categories</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-700">10+</p>
            <p className="mt-1 text-sm text-gray-600">Platforms</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-lg font-semibold text-gray-900">Browse by category</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/skills?category=${cat}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent verifications */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent verifications</h2>
          {skills.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No verified skills yet. Be the first to submit one.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillSummary }) {
  return (
    <Link
      to={`/skills/${skill.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-gray-900">{skill.name}</h3>
        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          {skill.ranking_score.toFixed(1)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{skill.summary}</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{skill.category}</span>
        {skill.github_stars > 0 && (
          <span className="text-xs text-gray-500">{skill.github_stars} stars</span>
        )}
      </div>
    </Link>
  );
}
