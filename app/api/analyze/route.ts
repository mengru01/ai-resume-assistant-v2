import { NextResponse } from "next/server";
import { z } from "zod";
import { rewriteResumeApplication } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/user";
import type { FreeAwarenessResult, FullApplicationResult } from "@/types/resume";

const requestSchema = z.object({
  resume_text: z.string().min(120, "Paste at least 120 characters from your resume.").max(30000),
  target_job: z.string().max(160).optional().default("")
});

function toFreeAwareness(result: FullApplicationResult): FreeAwarenessResult {
  return {
    score: result.score,
    risk_level: result.risk_level,
    vague_problems: result.vague_problems.slice(0, 2),
    interview_warning: result.interview_warning || "You are likely missing interview opportunities",
    gated: true
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);
    const user = await getOrCreateUser();

    if (!user.hasProAccess && user.analysisCount >= 1) {
      return NextResponse.json(
        {
          error: "FREE_LIMIT_REACHED",
          message: "Free users get 1 risk preview. Upgrade to Pro for the full execution system."
        },
        { status: 402 }
      );
    }

    const result = await rewriteResumeApplication({
      resumeText: input.resume_text,
      targetJob: input.target_job
    });
    const fullResultVisible = user.hasProAccess;

    await prisma.$transaction([
      prisma.analysis.create({
        data: {
          userId: user.id,
          resumeText: input.resume_text,
          targetJob: input.target_job || null,
          score: result.score,
          riskLevel: result.risk_level,
          vagueProblems: result.vague_problems,
          interviewWarning: result.interview_warning,
          rewrittenResume: result.rewritten_resume,
          atsVersion: result.ats_version,
          targetRoleVersion: result.target_role_version,
          fullProblemAnalysis: result.full_problem_analysis,
          positioningStrategy: result.positioning_strategy,
          careerDirectionAdvice: result.career_direction_advice,
          jobFits: result.job_fits,
          jobMatches: result.job_matches,
          fullResultVisible
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { analysisCount: { increment: 1 } }
      })
    ]);

    return NextResponse.json(fullResultVisible ? result : toFreeAwareness(result));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: error.errors[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: "REWRITE_FAILED", message }, { status: 500 });
  }
}
