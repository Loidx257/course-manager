import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMonthRange } from "@/lib/date-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const studentId = searchParams.get("studentId") || "";
    const courseTypeId = searchParams.get("courseTypeId") || "";

    const { start, end } = getMonthRange(year, month);

    const scheduleWhere: Record<string, unknown> = {
      userId: session.id,
      plannedDate: { gte: start, lte: end },
      status: "completed",
    };

    if (studentId) scheduleWhere.studentId = studentId;
    if (courseTypeId) scheduleWhere.courseTypeId = courseTypeId;

    // Overall stats
    const [totalSchedules, durationAgg, feeAgg] = await Promise.all([
      prisma.schedule.count({ where: scheduleWhere as any }),
      prisma.courseRecord.aggregate({
        _sum: { actualDuration: true },
        where: { schedule: scheduleWhere as any },
      }),
      prisma.feeRecord.aggregate({
        _sum: { finalAmount: true },
        where: {
          userId: session.id,
          schedule: scheduleWhere as any,
          needsPrice: false,
        },
      }),
    ]);

    // By settlement status
    const [unsettledAgg, settledAgg, needsPriceCount] = await Promise.all([
      prisma.feeRecord.aggregate({
        _sum: { finalAmount: true },
        where: {
          userId: session.id,
          settlementStatus: { not: "settled" },
          schedule: scheduleWhere as any,
          needsPrice: false,
        },
      }),
      prisma.feeRecord.aggregate({
        _sum: { finalAmount: true },
        where: {
          userId: session.id,
          settlementStatus: "settled",
          schedule: scheduleWhere as any,
          needsPrice: false,
        },
      }),
      prisma.feeRecord.count({
        where: {
          userId: session.id,
          needsPrice: true,
          schedule: scheduleWhere as any,
        },
      }),
    ]);

    // By student
    const byStudent = await prisma.feeRecord.groupBy({
      by: ["scheduleId"],
      where: {
        userId: session.id,
        schedule: scheduleWhere as any,
      },
      _sum: { finalAmount: true },
    });

    // Get student-level aggregation
    const studentFees = await prisma.schedule.groupBy({
      by: ["studentId"],
      where: scheduleWhere as any,
      _count: { id: true },
      _sum: { plannedDuration: true },
    });

    const studentDetails = await Promise.all(
      studentFees.map(async (sf) => {
        const student = await prisma.student.findUnique({
          where: { id: sf.studentId },
          select: { name: true },
        });

        const fees = await prisma.feeRecord.aggregate({
          _sum: { finalAmount: true },
          where: {
            userId: session.id,
            schedule: { ...scheduleWhere as any, studentId: sf.studentId },
            needsPrice: false,
          },
        });

        return {
          studentId: sf.studentId,
          studentName: student?.name || "未知",
          lessonCount: sf._count.id,
          totalDuration: sf._sum.plannedDuration || 0,
          totalFees: fees._sum.finalAmount || 0,
        };
      })
    );

    return NextResponse.json({
      totalSchedules,
      totalDuration: durationAgg._sum.actualDuration || 0,
      totalFees: feeAgg._sum.finalAmount || 0,
      unsettledFees: unsettledAgg._sum.finalAmount || 0,
      settledFees: settledAgg._sum.finalAmount || 0,
      needsPriceCount,
      byStudent: studentDetails,
    });
  } catch (error) {
    console.error("GET /api/statistics error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
