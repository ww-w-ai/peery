import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import type { Env } from "~/lib/db.server";

export const meta: MetaFunction = () => [
  { title: "Unverified Skills | Peery" },
  { name: "description", content: "Skills that did not pass Peery's automated security check. Review the reasons and decide for yourself." },
];

interface FlaggedSkill {
  id: string;
  git_url: string;
  name: string;
  reason: string;
  threats: string;
  flagged_at: string;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const result = await env.DB.prepare(
    "SELECT id, git_url, name, reason, threats, flagged_at FROM flagged_skills ORDER BY flagged_at DESC"
  ).all<FlaggedSkill>();

  return { flagged: result.results };
}

export default function FlaggedPage() {
  const { flagged } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Unverified Skills</h1>
      <p className="mt-2 text-gray-600">
        These skills did not pass Peery's automated security check.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold text-amber-800">Important Notice</h2>
        <p className="mt-1 text-sm text-amber-700">
          Peery uses automated analysis (regex pattern matching + dual LLM cross-check) to flag
          potential security concerns. Our checks are <strong>intentionally conservative</strong> —
          similar to how macOS or Windows warns about unsigned applications.
        </p>
        <p className="mt-2 text-sm text-amber-700">
          A skill listed here is <strong>not necessarily dangerous</strong>. It may have been flagged
          for patterns that are perfectly normal in its context (e.g., an API client making HTTP requests,
          or a deployment tool using shell commands). If you trust the author and understand the code,
          you may choose to use it at your own discretion.
        </p>
        <p className="mt-2 text-sm text-amber-700 font-medium">
          We recommend reviewing the source code yourself before installing any unverified skill.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {flagged.length === 0 ? (
          <p className="text-gray-500">No flagged skills at this time.</p>
        ) : (
          flagged.map((skill) => {
            const threats = (() => {
              try { return JSON.parse(skill.threats || "[]") as string[]; }
              catch { return []; }
            })();

            return (
              <div key={skill.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                    <a
                      href={skill.git_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {skill.git_url.replace("https://github.com/", "")}
                    </a>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    Unverified
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-700">{skill.reason}</p>

                {threats.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Flagged patterns</p>
                    <ul className="mt-1 space-y-1">
                      {threats.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-0.5 text-amber-500">&#9888;</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-400">
                  Flagged on {skill.flagged_at}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="font-semibold text-gray-800">How to evaluate yourself</h2>
        <ol className="mt-2 space-y-2 text-sm text-gray-600">
          <li><strong>1. Read the source code</strong> — Check the flagged files yourself. Is the pattern actually malicious or normal for the skill's purpose?</li>
          <li><strong>2. Check the author</strong> — Is this from a known developer or organization? Do they have other trusted projects?</li>
          <li><strong>3. Review the README</strong> — Does the skill clearly explain what it does and what permissions it needs?</li>
          <li><strong>4. Test in isolation</strong> — Run it in a sandboxed environment first if you're unsure.</li>
        </ol>
      </div>

      <div className="mt-6 text-center">
        <Link to="/skills" className="text-sm text-emerald-600 hover:underline">
          View verified skills instead
        </Link>
      </div>
    </div>
  );
}
