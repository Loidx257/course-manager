import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { scheduleSchema } from "@/lib/validators";
import { checkScheduleConflict, calculateEndTime } from "@/lib/conflict-checker";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const studentId = searchParams.get("studentId") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { userId: session.id };

    if (date) where.plannedDate = date;
    if (startDate && endDate) {
      where.plannedDate = { gte: startDate, lte: endDate };
    }
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const schedules = await prisma.schedule.findMany({
      where: where as any,
      include: {
        student: { select: { name: true } },
        courseType: { select: { name: true, color: true } },
        courseRecord: { select: { actualDuration: true, content: true } },
        feeRecord: { select: { finalAmount: true, settlementStatus: true } },
      },
      orderBy: [{ plannedDate: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("GET /api/schedules error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const result = scheduleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { studentId, courseTypeId, plannedDate, startTime, plannedDuration, repeatRule, location, onlineLink, notes, reminderEnabled } = result.data;

    // Verify student and course type belong to user
    const [student, courseType] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, userId: session.id } }),
      prisma.courseType.findFirst({ where: { id: courseTypeId, userId: session.id } }),
    ]);

    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });
    if (!courseType) return NextResponse.json({ error: "课程类型不存在" }, { status: 404 });

    const endTime = calculateEndTime(startTime, plannedDuration);

    // Check conflict
    const conflict = await checkScheduleConflict(session.id, plannedDate, startTime, endTime);
    if (conflict.hasConflict) {
      return NextResponse.json(
        { error: "时间冲突", conflicts: conflict.conflicts },
        { status: 409 }
      );
    }

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        userId: session.id,
        studentId,
        courseTypeId,
        plannedDate,
        startTime,
        endTime,
        plannedDuration,
        repeatRule: repeatRule || null,
        location: location || null,
        onlineLink: onlineLink || null,
        notes: notes || null,
        reminderEnabled: reminderEnabled ?? true,
      },
      include: {
        student: { select: { name: true } },
        courseType: { select: { name: true, color: true } },
      },
    });

    // Create reminder task
    if (schedule.reminderEnabled) {
      const settings = await prisma.systemSetting.findUnique({ where: { userId: session.id } });
      const reminderMinutes = settings?.defaultReminderMinutes || 1200;
      const remindDate = new Date(`${plannedDate}T${settings?.reminderTime || "20:00"}:00`);
      remindDate.setMinutes(remindDate.getMinutes() - reminderMinutes);

      await prisma.reminderTask.create({
        data: {
          scheduleId: schedule.id,
          remindAt: remindDate,
          channel: "in_app",
        },
      });
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedules error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
