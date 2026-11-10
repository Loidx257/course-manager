import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { completeCourseSchema } from "@/lib/validators";
import { resolveBillingConfig, calculateFee } from "@/lib/fee-calculator";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const result = completeCourseSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId: session.id },
      include: {
        courseType: true,
        student: {
          include: {
            studentCourses: {
              where: { courseTypeId: { equals: undefined } }, // Will get below
            },
          },
        },
      },
    });

    if (!schedule) return NextResponse.json({ error: "排课不存在" }, { status: 404 });

    const { actualStartTime, actualEndTime, actualDuration, content, feedback, homework, feeAdjustment, adjustmentReason } = result.data;

    // Get settings
    const settings = await prisma.systemSetting.findUnique({ where: { userId: session.id } });

    // Get student-course specific price
    const studentCourse = await prisma.studentCourse.findUnique({
      where: {
        studentId_courseTypeId: {
          studentId: schedule.studentId,
          courseTypeId: schedule.courseTypeId,
        },
      },
    });

    // Resolve billing config
    const billingConfig = resolveBillingConfig({
      scheduleFixedAmount: feeAdjustment ?? null,
      studentCoursePrice: studentCourse?.defaultPrice ?? null,
      studentCourseBillingUnit: studentCourse?.billingUnit ?? null,
      courseTypePrice: schedule.courseType.defaultPrice ?? null,
      courseTypeBillingMethod: schedule.courseType.billingMethod ?? null,
      courseTypeUnitMinutes: schedule.courseType.unitMinutes ?? null,
    });

    // Calculate fee
    const feeResult = calculateFee({
      actualDuration,
      billingMethod: billingConfig.billingMethod,
      unitMinutes: billingConfig.unitMinutes,
      pricePerUnit: billingConfig.pricePerUnit,
      fixedAmount: billingConfig.fixedAmount,
      roundingMethod: settings?.roundingMethod || "exact",
      minBillingUnit: settings?.minBillingUnit || 15,
    });

    // Use upsert to handle re-completion (course already has a record)
    const [courseRecord, feeRecord] = await prisma.$transaction([
      prisma.courseRecord.upsert({
        where: { scheduleId: id },
        create: {
          scheduleId: id,
          actualStartTime: actualStartTime || null,
          actualEndTime: actualEndTime || null,
          actualDuration,
          content,
          feedback: feedback || null,
          homework: homework || null,
        },
        update: {
          actualStartTime: actualStartTime || null,
          actualEndTime: actualEndTime || null,
          actualDuration,
          content,
          feedback: feedback || null,
          homework: homework || null,
        },
      }),
      prisma.feeRecord.upsert({
        where: { scheduleId: id },
        create: {
          scheduleId: id,
          userId: session.id,
          calculatedAmount: feeResult.calculatedAmount,
          adjustedAmount: feeAdjustment ?? null,
          finalAmount: feeAdjustment ?? feeResult.calculatedAmount,
          adjustmentReason: feeAdjustment ? adjustmentReason || null : null,
          billingRule: feeResult.billingRule,
          needsPrice: feeResult.needsPrice,
        },
        update: {
          calculatedAmount: feeResult.calculatedAmount,
          adjustedAmount: feeAdjustment ?? null,
          finalAmount: feeAdjustment ?? feeResult.calculatedAmount,
          adjustmentReason: feeAdjustment ? adjustmentReason || null : null,
          billingRule: feeResult.billingRule,
          needsPrice: feeResult.needsPrice,
          settlementStatus: "unsettled",
          settlementId: null,
        },
      }),
      prisma.schedule.update({
        where: { id },
        data: { status: "completed" },
      }),
    ]);

    return NextResponse.json({ courseRecord, feeRecord }, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedules/[id]/complete error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
