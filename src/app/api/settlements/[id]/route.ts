import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;

    const settlement = await prisma.settlement.findFirst({
      where: { id, userId: session.id },
      include: {
        student: { select: { name: true } },
        feeRecords: {
          include: {
            schedule: {
              include: {
                student: { select: { name: true } },
                courseType: { select: { name: true, color: true } },
                courseRecord: { select: { actualDuration: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!settlement) {
      return NextResponse.json({ error: "结算单不存在" }, { status: 404 });
    }

    return NextResponse.json(settlement);
  } catch (error) {
    console.error("GET /api/settlements/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;

    const settlement = await prisma.settlement.findFirst({
      where: { id, userId: session.id },
    });

    if (!settlement) {
      return NextResponse.json({ error: "结算单不存在" }, { status: 404 });
    }

    if (settlement.status === "cancelled") {
      return NextResponse.json({ error: "结算单已撤销" }, { status: 400 });
    }

    // Revert settlement: mark fees back to unsettled, cancel settlement
    await prisma.$transaction([
      prisma.feeRecord.updateMany({
        where: { settlementId: id },
        data: {
          settlementId: null,
          settlementStatus: "unsettled",
        },
      }),
      prisma.settlement.update({
        where: { id },
        data: { status: "cancelled" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settlements/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
