import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { courseTypeSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const courseTypes = await prisma.courseType.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(courseTypes);
  } catch (error) {
    console.error("GET /api/course-types error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const result = courseTypeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const courseType = await prisma.courseType.create({
      data: { ...result.data, userId: session.id },
    });

    return NextResponse.json(courseType, { status: 201 });
  } catch (error) {
    console.error("POST /api/course-types error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
