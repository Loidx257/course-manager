import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { reason, chargeFee } = body;

    const existing = await prisma.schedule.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "排课不存在" }, { status: 404 });

    await prisma.$transaction([
      prisma.schedule.update({
        where: { id },
        data: {
          status: chargeFee ? "absent" : "cancelled",
          cancelReason: reason || "手动取消",
        },
      }),
      prisma.reminderTask.updateMany({
        where: { scheduleId: id },
        data: { status: "cancelled" },
      }),
    ]);

    // If charge fee is true, create a fee record with 0 amount
    if (chargeFee) {
      await prisma.feeRecord.create({
        data: {
          scheduleId: id,
          userId: session.id,
          calculatedAmount: 0,
          finalAmount: 0,
          billingRule: JSON.stringify({ method: "absent_with_fee", reason }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/schedules/[id]/cancel error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
