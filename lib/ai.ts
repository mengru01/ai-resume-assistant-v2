import { z } from "zod";
import type { FullApplicationResult, RiskLevel } from "@/types/resume";

const jobFitSchema = z.object({
  career: z.string().min(2),
  reason: z.string().min(10)
});

const jobMatchSchema = z.object({
  job_title: z.string().min(2),
  company: z.string().min(2),
  location: z.string().min(2),
  reason: z.string().min(10),
  apply_link: z.string().min(8)
});

const resultSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  risk_level: z.enum(["HIGH", "MEDIUM", "LOW"]),
  vague_problems: z.array(z.string()).min(1).max(2),
  interview_warning: z.string().min(10),
  rewritten_resume: z.string().min(120),
  ats_version: z.string().min(120),
  target_role_version: z.string().min(120),
  full_problem_analysis: z.array(z.string()).min(3).max(8),
  positioning_strategy: z.string().min(40),
  career_direction_advice: z.string().min(40),
  job_fits: z.array(jobFitSchema).min(3).max(5),
  job_matches: z.array(jobMatchSchema).min(3).max(10)
});

const systemPrompt = `You are a senior career strategist, ATS resume editor, and job application assistant.

Product positioning:
This product is not a resume analysis tool.
It is an AI Resume Rewrite & Job Application Assistant.
The goal is to help users improve interview chances.

Core product logic:
Free Tier = Awareness
- show problems
- show risk
- NO solutions

Paid Tier = Execution
- rewrite resume
- job matching
- application links

Strict free/pro layering rules:
Free users can only see:
1. Resume Risk Score: 0-100
2. risk_level: HIGH / MEDIUM / LOW
3. 1-2 vague problems only
4. one sentence warning, such as "You are likely missing interview opportunities"

Free users must never see:
- complete resume rewrite content
- ATS keyword lists
- job matches
- apply links
- detailed career recommendations
- detailed instructions on how to fix the resume

Paid users unlock:
- full resume rewrite
- ATS optimized version
- target-role version
- ATS keyword gap analysis
- weak impact rewrite guidance
- hidden recruiter red flags
- 3-5 career directions with reasons
- 3-10 job matches with apply links
- career direction advice
- resume positioning strategy

Output strict JSON only:
{
  "score": 0,
  "risk_level": "HIGH",
  "vague_problems": [],
  "interview_warning": "",
  "rewritten_resume": "",
  "ats_version": "",
  "target_role_version": "",
  "full_problem_analysis": [],
  "positioning_strategy": "",
  "career_direction_advice": "",
  "job_fits": [
    {
      "career": "",
      "reason": ""
    }
  ],
  "job_matches": [
    {
      "job_title": "",
      "company": "",
      "location": "",
      "reason": "",
      "apply_link": ""
    }
  ]
}

Rules:
- This is not "give suggestions"; this is "rewrite + match + apply system".
- vague_problems must be intentionally broad and must not include exact fixes, keywords, job names, or rewrite instructions.
- Good vague examples: "Your resume may not pass ATS screening", "Your impact is not clearly demonstrated".
- rewritten_resume must be a complete, polished resume ready to copy and apply.
- ats_version must be a complete ATS-optimized resume version.
- target_role_version must tailor the resume to target_job. If target_job is missing, tailor it to the strongest likely role.
- full_problem_analysis may include ATS keyword gap analysis, weak impact rewrite, and hidden recruiter red flags.
- job_fits must include 3 to 5 career paths with reasons.
- job_matches must include 3 to 10 realistic jobs or search targets with clickable apply_link.
- If you cannot know a real direct application link, use a public LinkedIn or Indeed search URL.
- Do not write markdown. Do not include extra text.`;

function buildApplyLink(jobTitle: string, company: string, location: string) {
  const query = encodeURIComponent(`${jobTitle} ${company} ${location}`.trim());
  return `https://www.linkedin.com/jobs/search/?keywords=${query}`;
}

function normalizeApplyLink(link: string, jobTitle: string, company: string, location: string) {
  if (link.startsWith("https://") || link.startsWith("http://")) return link;
  return buildApplyLink(jobTitle, company, location);
}

function normalizeRiskLevel(score: number, riskLevel: RiskLevel): RiskLevel {
  if (riskLevel) return riskLevel;
  if (score < 55) return "HIGH";
  if (score < 78) return "MEDIUM";
  return "LOW";
}

export async function rewriteResumeApplication(input: {
  resumeText: string;
  targetJob?: string;
}): Promise<FullApplicationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `resume_text:\n${input.resumeText}\n\ntarget_job:\n${input.targetJob || "Not specified"}\n\nReturn the JSON object now.`
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI provider error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI provider did not return valid JSON.");
  }

  const result = resultSchema.parse(parsed);
  const score = Math.round(result.score);

  return {
    score,
    risk_level: normalizeRiskLevel(score, result.risk_level),
    vague_problems: result.vague_problems.slice(0, 2),
    interview_warning: result.interview_warning,
    rewritten_resume: result.rewritten_resume,
    ats_version: result.ats_version,
    target_role_version: result.target_role_version,
    full_problem_analysis: result.full_problem_analysis.slice(0, 8),
    positioning_strategy: result.positioning_strategy,
    career_direction_advice: result.career_direction_advice,
    job_fits: result.job_fits.slice(0, 5),
    job_matches: result.job_matches.slice(0, 10).map((job) => ({
      ...job,
      apply_link: normalizeApplyLink(job.apply_link, job.job_title, job.company, job.location)
    }))
  };
}
