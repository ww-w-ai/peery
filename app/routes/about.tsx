import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "About | Peery" },
    { name: "description", content: "How Peery verifies AI agent and skill security" },
  ];
};

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">About Peery</h1>

      <div className="space-y-8 text-zinc-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">What Peery Checks</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <span className="font-medium">Malicious patterns in source code</span> — regex-based
              static analysis detects destructive commands, data exfiltration, secret theft,
              obfuscated code, and unauthorized file access.
            </li>
            <li>
              <span className="font-medium">Malicious intent in instructions</span> — LLM-based
              semantic analysis evaluates agent/skill instructions for hidden prompt injection,
              deceptive behavior, or harmful intent.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">What "Listed" Means</h2>
          <p>
            A listed skill or agent has been safety-verified at a specific version (commit SHA).
            It passed both regex pattern matching and dual-LLM intent analysis at that point in time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">What "Not Listed" Means</h2>
          <p>
            A skill or agent that is not listed has simply not been reviewed yet. It does{" "}
            <span className="font-semibold">not</span> mean it is unsafe. Absence of verification
            is not a negative signal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Submit a public Git URL for verification.</li>
            <li>Automated scanners analyze the source code for known malicious patterns.</li>
            <li>
              Dual LLM cross-check (Gemini + DeepSeek) evaluates instructions and code
              for malicious intent independently.
            </li>
            <li>If both automated scan and LLM analysis pass, the skill is listed as verified.</li>
          </ol>
        </section>

        <section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2 text-zinc-900">AI Transparency Notice</h2>
          <p className="text-sm">
            Verifications use AI-assisted analysis (Gemini + DeepSeek). Results represent
            automated opinion, not certification. Two independent LLMs must agree for a
            skill to be listed, reducing single-model bias, but no automated system is
            infallible.
          </p>
        </section>
      </div>
    </div>
  );
}
