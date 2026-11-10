import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled", "absent", "rescheduled"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "无效的状态值" }, { status: 400 });
    }

    const existing = await prisma.schedule.findFirst({
      where: { id, userId: session.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: { status },
      include: {
        student: { select: { name: true } },
        courseType: { select: { name: true, color: true } },
        courseRecord: true,
        feeRecord: true,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("PATCH /api/schedules/[id]/status error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
