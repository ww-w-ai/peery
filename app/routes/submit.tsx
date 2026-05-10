import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { generateId } from "~/lib/db.server";
import { checkRateLimit } from "~/lib/kv.server";
import { isValidGitHubUrl } from "~/lib/utils";
import type { ScanJobMessage } from "~/lib/types";

interface ActionData {
  success?: boolean;
  jobId?: string;
  remaining?: number;
  errors?: { field: string; message: string }[];
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  const gitUrl = (formData.get("git_url") as string)?.trim() || "";
  const tag = (formData.get("tag") as string)?.trim() || "";

  const errors: { field: string; message: string }[] = [];

  if (!gitUrl) {
    errors.push({ field: "git_url", message: "Git URL is required." });
  } else if (!isValidGitHubUrl(gitUrl)) {
    errors.push({ field: "git_url", message: "Must be a valid GitHub URL (github.com/owner/repo)." });
  }

  if (errors.length > 0) {
    return { errors } satisfies ActionData;
  }

  // Rate limit
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const { allowed, remaining } = await checkRateLimit(env.KV, ip);

  if (!allowed) {
    errors.push({ field: "git_url", message: "Rate limit reached. Maximum 5 submissions per day." });
    return { errors } satisfies ActionData;
  }

  // Queue scan
  const jobId = generateId();
  try {
    const message: ScanJobMessage = {
      job_id: jobId,
      git_url: gitUrl,
      tag: tag || "",
      submitted_at: new Date().toISOString(),
      callback_url: `${new URL(request.url).origin}/api/callback`,
    };
    await env.SCAN_QUEUE.send(message);
  } catch (err) {
    console.error("Queue send failed:", err);
  }

  return { success: true, jobId, remaining } satisfies ActionData;
}

export default function SubmitPage() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Submit a skill for verification</h1>
      <p className="mt-2 text-sm text-gray-600">
        Provide a GitHub repository URL and we will run security scans against the source code.
      </p>

      {actionData?.success ? (
        <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-medium text-emerald-900">Scan queued</h2>
          <p className="mt-1 text-sm text-emerald-700">
            We will process this shortly. Job ID: <code className="font-mono">{actionData.jobId}</code>
          </p>
          {actionData.remaining !== undefined && (
            <p className="mt-2 text-xs text-emerald-600">
              {actionData.remaining} submissions remaining today.
            </p>
          )}
        </div>
      ) : (
        <Form method="post" className="mt-8 space-y-5">
          {/* Git URL */}
          <div>
            <label htmlFor="git_url" className="block text-sm font-medium text-gray-700">
              GitHub URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="git_url"
              name="git_url"
              required
              placeholder="https://github.com/owner/repo"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <FieldError errors={actionData?.errors} field="git_url" />
          </div>

          {/* Tag */}
          <div>
            <label htmlFor="tag" className="block text-sm font-medium text-gray-700">
              Version tag <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="tag"
              name="tag"
              placeholder="v1.0.0"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit for verification"}
          </button>

          <p className="text-xs text-gray-500">
            Rate limit: 5 submissions per day per IP address.
          </p>
        </Form>
      )}
    </div>
  );
}

function FieldError({ errors, field }: { errors?: { field: string; message: string }[]; field: string }) {
  const error = errors?.find((e) => e.field === field);
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-600">{error.message}</p>;
}
