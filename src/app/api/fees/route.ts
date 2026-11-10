import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "";
    const status = searchParams.get("settlementStatus") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: Record<string, unknown> = { userId: session.id };

    if (studentId) {
      where.schedule = { studentId };
    }
    if (status) where.settlementStatus = status;
    if (startDate && endDate) {
      where.schedule = {
        ...((where.schedule as Record<string, unknown>) || {}),
        plannedDate: { gte: startDate, lte: endDate },
      };
    }

    const fees = await prisma.feeRecord.findMany({
      where: where as any,
      include: {
        schedule: {
          include: {
            student: { select: { name: true } },
            courseType: { select: { name: true } },
            courseRecord: { select: { actualDuration: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(fees);
  } catch (error) {
    console.error("GET /api/fees error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
