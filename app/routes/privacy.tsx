import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Peery" },
    { name: "description", content: "Peery Privacy Policy" },
  ];
};

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: 2025-05-10</p>

      <div className="space-y-6 text-zinc-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">1. What We Analyze</h2>
          <p>
            Peery analyzes publicly available open-source code hosted on platforms like GitHub.
            We only process code that is already publicly accessible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">2. Data We Collect</h2>
          <p>
            We collect minimal data: the Git URLs submitted for verification and the
            resulting scan reports. We do not collect personal information beyond what
            is necessary to process a submission.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">3. No Cookies (Phase 1)</h2>
          <p>
            In our current phase, we do not use cookies or tracking technologies.
            This may change in future phases, at which point this policy will be updated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">4. No PII Storage</h2>
          <p>
            We do not store personally identifiable information. Submitted URLs are
            associated with scan results but not linked to individual users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">5. Legal Basis (GDPR)</h2>
          <p>
            Our legal basis for processing is legitimate interest in security verification
            of publicly available open-source software. This serves the broader community
            interest in software safety.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">6. Your Rights</h2>
          <p>
            You have the right to request deletion of any data associated with your
            submissions. Contact us at <a href="mailto:privacy@peery.ai" className="text-blue-600 underline">privacy@peery.ai</a> to
            exercise this right.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-zinc-900">7. Data Retention</h2>
          <p>
            Scan results are retained indefinitely as part of the public verification
            registry. Submission metadata may be purged after 90 days.
          </p>
        </section>
      </div>
    </div>
  );
}
