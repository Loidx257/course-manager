import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { scheduleSchema } from "@/lib/validators";
import { checkScheduleConflict, calculateEndTime } from "@/lib/conflict-checker";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId: session.id },
      include: {
        student: true,
        courseType: true,
        courseRecord: true,
        feeRecord: true,
        reminderTasks: { orderBy: { remindAt: "desc" } },
      },
    });

    if (!schedule) return NextResponse.json({ error: "排课不存在" }, { status: 404 });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("GET /api/schedules/[id] error:", error);
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
    const result = scheduleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.schedule.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "排课不存在" }, { status: 404 });

    const endTime = calculateEndTime(result.data.startTime, result.data.plannedDuration);

    // Check conflict (exclude self)
    const conflict = await checkScheduleConflict(
      session.id,
      result.data.plannedDate,
      result.data.startTime,
      endTime,
      id
    );

    if (conflict.hasConflict) {
      return NextResponse.json(
        { error: "时间冲突", conflicts: conflict.conflicts },
        { status: 409 }
      );
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...result.data,
        endTime,
        repeatRule: result.data.repeatRule || null,
      },
      include: {
        student: { select: { name: true } },
        courseType: { select: { name: true, color: true } },
      },
    });

    // Update reminder tasks
    await prisma.reminderTask.deleteMany({ where: { scheduleId: id } });
    if (schedule.reminderEnabled && schedule.status === "pending") {
      const settings = await prisma.systemSetting.findUnique({ where: { userId: session.id } });
      const reminderMinutes = settings?.defaultReminderMinutes || 1200;
      const remindDate = new Date(`${schedule.plannedDate}T${settings?.reminderTime || "20:00"}:00`);
      remindDate.setMinutes(remindDate.getMinutes() - reminderMinutes);

      await prisma.reminderTask.create({
        data: {
          scheduleId: schedule.id,
          remindAt: remindDate,
          channel: "in_app",
        },
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("PUT /api/schedules/[id] error:", error);
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

    const existing = await prisma.schedule.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "排课不存在" }, { status: 404 });

    // Cancel instead of delete
    await prisma.schedule.update({
      where: { id },
      data: { status: "cancelled", cancelReason: "手动取消" },
    });

    // Cancel reminders
    await prisma.reminderTask.updateMany({
      where: { scheduleId: id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/schedules/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
