"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ApplicationResultResponse,
  FreeAwarenessResult,
  FullApplicationResult
} from "@/types/resume";

type Me = {
  id: string;
  hasProAccess: boolean;
  analysisCount: number;
  remainingFreeAnalyses: number | null;
};

const sampleResume = `Alex Chen
Product Manager
- Led the onboarding flow redesign for a B2B SaaS product, increasing activation from 34% to 51%.
- Partnered with engineering and design to ship product roadmap features.
- Built Amplitude and SQL dashboards to monitor funnel performance.`;

const fallbackRisk: FreeAwarenessResult = {
  score: 42,
  risk_level: "HIGH",
  vague_problems: ["ATS mismatch", "Weak impact statements"],
  interview_warning: "You may be filtered out before a recruiter sees your resume.",
  gated: true
};

const fallbackPro: FullApplicationResult = {
  score: 42,
  risk_level: "HIGH",
  vague_problems: fallbackRisk.vague_problems,
  interview_warning: fallbackRisk.interview_warning,
  rewritten_resume: `Alex Chen - Senior Product Manager

B2B SaaS product manager with experience driving user activation, funnel optimization, and data-informed product decisions. Improved activation from 34% to 51% by redesigning onboarding and using analytics to identify drop-off points.

Core Achievements
- Redesigned onboarding and increased activation by 17 percentage points.
- Built Amplitude and SQL dashboards to improve product iteration.
- Partnered with engineering and design to ship high-impact roadmap features.`,
  ats_version:
    "Senior Product Manager | B2B SaaS | Activation Growth | Product Analytics | SQL | Amplitude | Roadmap Planning | Funnel Optimization",
  target_role_version:
    "Targeted for Senior Product Manager roles focused on B2B SaaS activation, growth, analytics, and cross-functional roadmap execution.",
  full_problem_analysis: [
    "ATS keyword gap analysis",
    "Weak impact rewrite",
    "Hidden recruiter red flags"
  ],
  positioning_strategy:
    "Position the resume around SaaS growth, activation metrics, and cross-functional delivery instead of generic product tasks.",
  career_direction_advice:
    "Best-fit paths include Senior Product Manager, Growth Product Manager, and Product Analytics roles.",
  job_fits: [
    { career: "Senior Product Manager", reason: "Strong fit for B2B SaaS roadmap and activation work" },
    { career: "Growth Product Manager", reason: "Matches funnel analytics and onboarding improvements" },
    { career: "Product Analyst", reason: "Fits SQL, Amplitude, and product data experience" }
  ],
  job_matches: [
    {
      job_title: "Senior Product Manager",
      company: "Stripe",
      location: "Remote",
      reason: "Strong match for SaaS growth and product analytics",
      apply_link: "https://www.linkedin.com/jobs/search/?keywords=Senior%20Product%20Manager%20Stripe"
    },
    {
      job_title: "Product Manager",
      company: "Notion",
      location: "San Francisco",
      reason: "Matches roadmap planning and user growth experience",
      apply_link: "https://www.linkedin.com/jobs/search/?keywords=Product%20Manager%20Notion"
    },
    {
      job_title: "Growth Product Manager",
      company: "Canva",
      location: "Remote",
      reason: "Matches growth experiments and data-informed product decisions",
      apply_link: "https://www.linkedin.com/jobs/search/?keywords=Growth%20Product%20Manager%20Canva"
    }
  ]
};

function isFullResult(result: ApplicationResultResponse): result is FullApplicationResult {
  return !("gated" in result && result.gated);
}

export default function Home() {
  const [resumeText, setResumeText] = useState(sampleResume);
  const [targetJob, setTargetJob] = useState("Senior Product Manager");
  const [result, setResult] = useState<ApplicationResultResponse | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function refreshMe() {
    const data = await fetch("/api/me").then((response) => response.json());
    setMe(data);
  }

  useEffect(() => {
    void refreshMe().catch(() => undefined);
  }, []);

  const canRewrite = useMemo(
    () => resumeText.trim().length >= 120 && !loading && !checkoutLoading,
    [resumeText, loading, checkoutLoading]
  );

  async function rewriteResume() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          target_job: targetJob
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to process this resume.");
      }

      setResult(data);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    setCheckoutLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.message ?? "Unable to open checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setCheckoutLoading(false);
    }
  }

  async function copyResume() {
    const full = result && isFullResult(result) ? result : fallbackPro;
    await navigator.clipboard.writeText(full.rewritten_resume);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const freeResult = result && !isFullResult(result) ? result : result ? null : fallbackRisk;
  const fullResult = result && isFullResult(result) ? result : me?.hasProAccess ? fallbackPro : null;
  const problems = (freeResult?.vague_problems ?? fallbackRisk.vague_problems).slice(0, 2);
  const score = freeResult?.score ?? fullResult?.score ?? fallbackRisk.score;
  const riskLevel = freeResult?.risk_level ?? fullResult?.risk_level ?? fallbackRisk.risk_level;

  return (
    <main className="min-h-screen bg-[#EFF6FF] text-slate-950">
      <div className="mx-auto w-full max-w-[980px] px-4 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2563EB] text-sm font-black text-white shadow-lg shadow-blue-600/20">
              AI
            </span>
            <span className="font-black">AI Resume Assistant</span>
          </div>
          <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-slate-600">
            {me?.hasProAccess ? "Pro unlocked" : `Free uses: ${me?.remainingFreeAnalyses ?? 1}`}
          </span>
        </header>

        <section className="mx-auto mt-12 max-w-3xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-normal md:text-6xl">
            Why your resume is not getting interviews
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Discover what's blocking your interviews - and fix it in one click.
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
          <label className="text-sm font-black text-slate-700">Resume input</label>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            className="mt-3 min-h-[190px] w-full resize-none rounded-xl border border-slate-200 p-4 text-sm leading-7 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            placeholder="Paste your resume here..."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="text-sm font-black text-slate-700">Target job (optional)</label>
              <input
                value={targetJob}
                onChange={(event) => setTargetJob(event.target.value)}
                className="mt-3 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                placeholder="e.g. Senior Product Manager"
              />
            </div>
            <button
              onClick={rewriteResume}
              disabled={!canRewrite}
              className="h-12 rounded-xl bg-[#2563EB] px-8 text-sm font-black text-white shadow-lg shadow-blue-600/25 hover:bg-[#1D4ED8]"
            >
              {loading ? "Rewriting..." : "Fix Resume"}
            </button>
          </div>
        </section>

        {error ? (
          <section className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </section>
        ) : null}

        <section className="mt-5 grid gap-4 md:grid-cols-[0.78fr_1fr]">
          <article className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#2563EB]">Resume Risk</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-6xl font-black leading-none">{score}</span>
                  <span className="pb-2 text-lg font-black text-slate-500">/ 100</span>
                </div>
              </div>
              <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-black text-red-600">
                {riskLevel}
              </span>
            </div>
            <p className="mt-5 rounded-xl bg-[#EFF6FF] p-4 text-sm font-bold leading-6 text-[#1D4ED8]">
              You may be filtered out before a recruiter sees your resume.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
            <p className="text-sm font-black text-[#2563EB]">Why you're being rejected</p>
            <ul className="mt-4 grid gap-3">
              {problems.map((problem) => (
                <li key={problem} className="rounded-xl border border-slate-200 p-4 text-sm font-black text-slate-700">
                  {problem}
                </li>
              ))}
            </ul>
          </article>
        </section>

        {!fullResult ? (
          <section className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-normal text-orange-600">Locked</p>
                <h2 className="mt-2 text-2xl font-black">Unlock full results</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  See exactly why you're not getting interviews and how to fix it.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-orange-700">
                  <span className="rounded-full bg-white px-3 py-2">Resume rewrite</span>
                  <span className="rounded-full bg-white px-3 py-2">ATS fix</span>
                  <span className="rounded-full bg-white px-3 py-2">Job matches</span>
                </div>
              </div>
              <button
                onClick={checkout}
                disabled={checkoutLoading}
                className="h-12 rounded-xl bg-[#2563EB] px-8 text-sm font-black text-white shadow-lg shadow-blue-600/25 hover:bg-[#1D4ED8]"
              >
                {checkoutLoading ? "Opening..." : "Fix my resume"}
              </button>
            </div>
          </section>
        ) : null}

        {fullResult ? (
          <section className="mt-5 grid gap-4">
            <article className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#2563EB]">Your improved resume</p>
                  <h2 className="mt-1 text-2xl font-black">Ready to copy and apply</h2>
                </div>
                <button
                  onClick={copyResume}
                  className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-[#1D4ED8]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-800">
                {fullResult.rewritten_resume}
              </pre>
            </article>

            <article className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-blue-100">
              <p className="text-sm font-black text-[#2563EB]">Jobs you can apply to</p>
              <div className="mt-4 grid gap-3">
                {fullResult.job_matches.slice(0, 5).map((job) => (
                  <div key={`${job.job_title}-${job.company}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h3 className="font-black">{job.job_title}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {job.company} - {job.location}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{job.reason}</p>
                    </div>
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[#2563EB] px-5 py-3 text-center text-sm font-black text-white"
                    >
                      Apply
                    </a>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
