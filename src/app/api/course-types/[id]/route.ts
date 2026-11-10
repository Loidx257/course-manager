import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { courseTypeSchema } from "@/lib/validators";
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
    const result = courseTypeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.courseType.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "课程类型不存在" }, { status: 404 });

    const courseType = await prisma.courseType.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json(courseType);
  } catch (error) {
    console.error("PUT /api/course-types/[id] error:", error);
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

    const existing = await prisma.courseType.findFirst({ where: { id, userId: session.id } });
    if (!existing) return NextResponse.json({ error: "课程类型不存在" }, { status: 404 });

    // Deactivate instead of delete
    await prisma.courseType.update({
      where: { id },
      data: { status: "inactive" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/course-types/[id] error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
