import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { createToken, setSessionCookie } from "@/lib/auth";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, phone, password } = result.data;

    // Check if phone already exists
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return NextResponse.json(
          { error: "该手机号已注册" },
          { status: 409 }
        );
      }
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { name, phone: phone || null, passwordHash },
    });

    // Create default system settings
    await prisma.systemSetting.create({
      data: { userId: user.id },
    });

    const token = await createToken({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
