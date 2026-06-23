export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type JobFit = {
  career: string;
  reason: string;
};

export type JobMatch = {
  job_title: string;
  company: string;
  location: string;
  reason: string;
  apply_link: string;
};

export type FullApplicationResult = {
  score: number;
  risk_level: RiskLevel;
  vague_problems: string[];
  interview_warning: string;
  rewritten_resume: string;
  ats_version: string;
  target_role_version: string;
  full_problem_analysis: string[];
  positioning_strategy: string;
  career_direction_advice: string;
  job_fits: JobFit[];
  job_matches: JobMatch[];
};

export type FreeAwarenessResult = {
  score: number;
  risk_level: RiskLevel;
  vague_problems: string[];
  interview_warning: string;
  gated: true;
};

export type ApplicationResultResponse =
  | (FullApplicationResult & { gated?: false })
  | FreeAwarenessResult;
