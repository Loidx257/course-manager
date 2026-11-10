import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { adjustedAmount, reason } = body;

    const existing = await prisma.feeRecord.findFirst({
      where: { id, userId: session.id },
      include: { schedule: true },
    });

    if (!existing) return NextResponse.json({ error: "费用记录不存在" }, { status: 404 });
    if (existing.settlementStatus === "settled") {
      return NextResponse.json(
        { error: "已结算课程不可直接修改金额，请先取消结算" },
        { status: 400 }
      );
    }

    const updated = await prisma.feeRecord.update({
      where: { id },
      data: {
        adjustedAmount: adjustedAmount,
        finalAmount: adjustedAmount,
        adjustmentReason: reason || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/fees/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
