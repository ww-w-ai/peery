import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { Env, VersionRow, GraphEdgeRow } from "~/lib/db.server";
import { parseJsonField } from "~/lib/utils";
import { useState } from "react";

interface SkillDetail {
  id: string;
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
  ranking_score: number;
  created_at: string;
  updated_at: string;
}

interface LoaderData {
  skill: SkillDetail;
  versions: VersionRow[];
  edges: Array<{ target_skill_id: string; edge_type: string; target_name?: string }>;
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const id = params.id;

  const [row, versionsResult, edgesResult] = await Promise.all([
    env.DB.prepare("SELECT * FROM skills WHERE id = ?").bind(id).first(),
    env.DB.prepare("SELECT * FROM versions WHERE skill_id = ? ORDER BY scanned_at DESC").bind(id).all(),
    env.DB.prepare("SELECT target_skill_id, edge_type FROM graph_edges WHERE source_skill_id = ?").bind(id).all(),
  ]);

  if (!row) {
    throw new Response("Skill not found", { status: 404 });
  }

  const skill: SkillDetail = {
    id: row.id as string,
    git_url: row.git_url as string,
    name: row.name as string,
    summary: row.summary as string,
    deep_review: row.deep_review as string,
    category: row.category as string,
    use_cases: parseJsonField(row.use_cases as string),
    when_to_use: row.when_to_use as string,
    how_to_use: row.how_to_use as string,
    platforms: parseJsonField(row.platforms as string),
    setup_complexity: row.setup_complexity as string,
    requires: parseJsonField(row.requires as string),
    highlights: parseJsonField(row.highlights as string),
    score: parseJsonField(row.score_json as string),
    github_stars: row.github_stars as number,
    ranking_score: row.ranking_score as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };

  const versions = (versionsResult.results || []) as unknown as VersionRow[];
  const edges = (edgesResult.results || []) as unknown as Array<{ target_skill_id: string; edge_type: string }>;

  return { skill, versions, edges } satisfies LoaderData;
}

export default function SkillDetailPage() {
  const { skill, versions, edges } = useLoaderData<LoaderData>();

  const badgeMarkdown = `[![Verified by Peery](https://peery.ai/badge/${skill.id}.svg)](https://peery.ai/skills/${skill.id})`;
  const badgeHtml = `<a href="https://peery.ai/skills/${skill.id}"><img src="https://peery.ai/badge/${skill.id}.svg" alt="Verified by Peery" /></a>`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{skill.name}</h1>
          <p className="mt-1 text-gray-600">{skill.summary}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Verified
        </span>
      </div>

      {/* Platform tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {skill.platforms.map((p) => (
          <span key={p} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {p}
          </span>
        ))}
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {skill.category}
        </span>
      </div>

      {/* Score breakdown */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Score breakdown</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreCard label="Usefulness" value={skill.score.usefulness} />
          <ScoreCard label="Documentation" value={skill.score.documentation} />
          <ScoreCard label="Maintenance" value={skill.score.maintenance} />
          <ScoreCard label="Uniqueness" value={skill.score.uniqueness} />
        </div>
      </section>

      {/* Highlights */}
      {skill.highlights.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Highlights</h2>
          <ul className="mt-3 space-y-2">
            {skill.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-700">{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Deep review */}
      {skill.deep_review && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Deep review</h2>
          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 leading-relaxed">
            {skill.deep_review}
          </div>
        </section>
      )}

      {/* Metadata grid */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <MetaBlock title="When to use" content={skill.when_to_use} />
        <MetaBlock title="How to use" content={skill.how_to_use} />
        <MetaBlock title="Setup complexity" content={skill.setup_complexity} />
        <MetaBlock title="Requires" content={skill.requires.join(", ") || "None"} />
      </section>

      {/* Version history */}
      {versions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Version history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Tag</th>
                  <th className="pb-2 pr-4">SHA</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-xs">{v.tag || "–"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{v.git_sha.slice(0, 7)}</td>
                    <td className="py-2 pr-4 text-gray-600">{v.scanned_at ? new Date(v.scanned_at).toLocaleDateString() : "–"}</td>
                    <td className="py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${v.status === "pass" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Related skills */}
      {edges.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Related skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {edges.map((e, i) => (
              <Link
                key={i}
                to={`/skills/${e.target_skill_id}`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                <span className="text-gray-400">{e.edge_type}:</span>
                <span>{e.target_name || e.target_skill_id}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Badge embed */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Badge embed</h2>
        <div className="mt-3 space-y-3">
          <CopyBlock label="Markdown" value={badgeMarkdown} />
          <CopyBlock label="HTML" value={badgeHtml} />
        </div>
      </section>

      {/* External link */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <a
          href={skill.git_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          View source repository
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const percentage = (value / 10) * 100;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}/10</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-emerald-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetaBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{title}</p>
      <p className="mt-1 text-sm text-gray-700">{content || "–"}</p>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <textarea
          readOnly
          value={value}
          rows={2}
          className="flex-1 resize-none rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-700"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
