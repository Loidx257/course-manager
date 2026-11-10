import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { settlementSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { userId: session.id };

    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const settlements = await prisma.settlement.findMany({
      where: where as any,
      include: {
        student: { select: { name: true } },
        feeRecords: { select: { id: true, finalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = settlements.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.student?.name || "全部学生",
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      expectedAmount: s.expectedAmount,
      actualAmount: s.actualAmount,
      status: s.status,
      notes: s.notes,
      feeCount: s.feeRecords.length,
      createdAt: s.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/settlements error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const result = settlementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { studentId, periodStart, periodEnd, notes, feeIds } = result.data;

    // Verify all fee records belong to the user and are unsettled
    const fees = await prisma.feeRecord.findMany({
      where: {
        id: { in: feeIds },
        userId: session.id,
        settlementStatus: "unsettled",
      },
      include: {
        schedule: {
          select: {
            studentId: true,
            plannedDate: true,
          },
        },
      },
    });

    if (fees.length !== feeIds.length) {
      return NextResponse.json(
        { error: "部分费用记录不存在或已结算" },
        { status: 400 }
      );
    }

    // If studentId filter is provided, verify fees belong to that student
    if (studentId) {
      const mismatched = fees.filter((f) => f.schedule.studentId !== studentId);
      if (mismatched.length > 0) {
        return NextResponse.json(
          { error: "部分费用记录不属于所选学生" },
          { status: 400 }
        );
      }
    }

    // Filter by date range
    const inRange = fees.filter(
      (f) => f.schedule.plannedDate >= periodStart && f.schedule.plannedDate <= periodEnd
    );
    if (inRange.length !== fees.length) {
      return NextResponse.json(
        { error: "部分费用记录不在所选日期范围内" },
        { status: 400 }
      );
    }

    // Calculate amounts
    const expectedAmount = fees.reduce((sum, f) => sum + f.calculatedAmount, 0);
    const actualAmount = fees.reduce((sum, f) => sum + f.finalAmount, 0);

    // Create settlement and update fees in transaction
    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.settlement.create({
        data: {
          userId: session.id,
          studentId: studentId || null,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          expectedAmount: Math.round(expectedAmount * 100) / 100,
          actualAmount: Math.round(actualAmount * 100) / 100,
          status: "confirmed",
          notes: notes || null,
        },
      });

      // Mark all fees as settled
      await tx.feeRecord.updateMany({
        where: { id: { in: feeIds } },
        data: {
          settlementId: s.id,
          settlementStatus: "settled",
        },
      });

      return s;
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    console.error("POST /api/settlements error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
