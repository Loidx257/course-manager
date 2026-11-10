import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { settingsSchema } from "@/lib/validators";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const settings = await prisma.systemSetting.upsert({
      where: { userId: session.id },
      create: { userId: session.id },
      update: {},
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const body = await request.json();
    const result = settingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const settings = await prisma.systemSetting.upsert({
      where: { userId: session.id },
      create: { userId: session.id, ...result.data },
      update: result.data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
