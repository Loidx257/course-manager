import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { studentSchema } from "@/lib/validators";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Prisma.StudentWhereInput = {
      userId: session.id,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { targetUniversity: { contains: search } },
      ];
    }

    const [students, completedRecords] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          studentCourses: { include: { courseType: { select: { name: true, color: true } } } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.courseRecord.findMany({
        where: {
          actualDuration: { not: null },
          schedule: {
            userId: session.id,
            status: "completed",
            student: { deletedAt: null },
          },
        },
        select: {
          actualDuration: true,
          schedule: { select: { studentId: true } },
        },
      }),
    ]);

    const completedMinutesByStudent = new Map<string, number>();
    for (const record of completedRecords) {
      const studentId = record.schedule.studentId;
      completedMinutesByStudent.set(
        studentId,
        (completedMinutesByStudent.get(studentId) || 0) + (record.actualDuration || 0)
      );
    }

    return NextResponse.json(
      students.map((student) => ({
        ...student,
        progress: {
          totalMinutes: student.totalCourseMinutes,
          completedMinutes: completedMinutesByStudent.get(student.id) || 0,
        },
      }))
    );
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const result = studentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: { ...result.data, userId: session.id },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
