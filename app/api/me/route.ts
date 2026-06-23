import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";

export async function GET() {
  const user = await getOrCreateUser();

  return NextResponse.json({
    id: user.id,
    hasProAccess: user.hasProAccess,
    analysisCount: user.analysisCount,
    remainingFreeAnalyses: user.hasProAccess ? null : Math.max(0, 1 - user.analysisCount)
  });
}
