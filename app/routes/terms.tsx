import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | Peery" },
    { name: "description", content: "Peery Terms of Service" },
  ];
};

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: 2025-05-10</p>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">1. Nature of Service</h2>
          <p>
            Peery provides point-in-time automated security assessments of publicly available
            open-source AI agent and skill source code. Each verification reflects the state of
            the code at a specific commit SHA at the time of analysis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">2. No Warranty</h2>
          <p>
            The service is provided "as is" without warranty of any kind, express or implied,
            including but not limited to warranties of merchantability, fitness for a particular
            purpose, or non-infringement. Use Peery results at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">3. What "Verified" Means</h2>
          <p>
            A "Verified" status means the code passed our automated security checks at the
            specified version. It does not constitute a certification, guarantee of safety,
            or endorsement. It is an automated assessment, not a professional audit.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">4. Results Are Opinion</h2>
          <p>
            Verification results represent the automated opinion of our scanning systems,
            which include AI-assisted analysis. They should be considered one data point
            among many when evaluating software safety.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Peery and its operators shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages,
            or any loss of profits or revenues, whether incurred directly or indirectly,
            arising from your use of or reliance on the service. Total liability is capped
            at the amount you paid for the service in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">6. Acceptable Use</h2>
          <p>
            You may not use Peery to submit malicious URLs, overwhelm the service with
            automated requests beyond reasonable use, or misrepresent verification results.
          </p>
        </section>
      </div>
    </div>
  );
}
