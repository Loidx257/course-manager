import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { studentSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id, userId: session.id },
      include: {
        studentCourses: { include: { courseType: { select: { name: true, color: true, billingMethod: true, defaultPrice: true } } } },
        schedules: {
          include: {
            courseType: { select: { name: true, color: true } },
            feeRecord: { select: { finalAmount: true, settlementStatus: true } },
          },
          orderBy: { plannedDate: "desc" },
          take: 20,
        },
      },
    });

    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    // Summary stats are aggregated independently from the 20-item history above.
    const [totalLessons, durationAgg, totalFeesAgg, unsettledFeesAgg] = await Promise.all([
      prisma.schedule.count({
        where: { studentId: id, userId: session.id, status: "completed" },
      }),
      prisma.courseRecord.aggregate({
        where: {
          actualDuration: { not: null },
          schedule: { studentId: id, userId: session.id, status: "completed" },
        },
        _sum: { actualDuration: true },
      }),
      prisma.feeRecord.aggregate({
        where: { userId: session.id, schedule: { studentId: id } },
        _sum: { finalAmount: true },
      }),
      prisma.feeRecord.aggregate({
        where: {
          userId: session.id,
          settlementStatus: { not: "settled" },
          schedule: { studentId: id },
        },
        _sum: { finalAmount: true },
      }),
    ]);

    const totalDuration = durationAgg._sum.actualDuration || 0;
    const totalFees = totalFeesAgg._sum.finalAmount || 0;
    const unsettledFees = unsettledFeesAgg._sum.finalAmount || 0;

    return NextResponse.json({
      ...student,
      stats: { totalLessons, totalDuration, totalFees, unsettledFees },
      progress: {
        totalMinutes: student.totalCourseMinutes,
        completedMinutes: totalDuration,
      },
    });
  } catch (error) {
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const result = studentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.student.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    const student = await prisma.student.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error("PUT /api/students/[id] error:", error);
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

    const existing = await prisma.student.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    // Soft delete
    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: "archived" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
