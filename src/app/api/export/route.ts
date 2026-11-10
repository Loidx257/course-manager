import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateExcelExport } from "@/lib/export-helper";
import { NextResponse } from "next/server";

function excelResponse(data: Buffer, filename: string) {
  // Node Buffer → Uint8Array for BodyInit compatibility
  const arr = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
  return new Response(arr, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "courses"; // courses, fees, students

    if (type === "students") {
      const students = await prisma.student.findMany({
        where: { userId: session.id, deletedAt: null },
        orderBy: { name: "asc" },
      });

      const rows = students.map((s) => ({
        "姓名": s.name,
        "昵称": s.nickname || "",
        "手机号": s.phone || "",
        "微信": s.wechat || "",
        "报考年份": s.examYear || "",
        "目标院校": s.targetUniversity || "",
        "目标专业": s.targetMajor || "",
        "考试科目": s.examSubjects || "",
        "状态": s.status,
        "备注": s.notes || "",
      }));

      const buffer = generateExcelExport(rows, "学生档案", "students.xlsx");
      return excelResponse(buffer, "students.xlsx");
    }

    if (type === "fees") {
      const fees = await prisma.feeRecord.findMany({
        where: { userId: session.id },
        include: {
          schedule: {
            include: {
              student: { select: { name: true } },
              courseType: { select: { name: true } },
              courseRecord: { select: { actualDuration: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const rows = fees.map((f) => ({
        "学生": f.schedule?.student?.name || "",
        "课程类型": f.schedule?.courseType?.name || "",
        "日期": f.schedule?.plannedDate || "",
        "实际时长(分钟)": f.schedule?.courseRecord?.actualDuration || 0,
        "计算金额": f.calculatedAmount,
        "调整金额": f.adjustedAmount || "",
        "最终金额": f.finalAmount,
        "调整原因": f.adjustmentReason || "",
        "结算状态": f.settlementStatus,
        "待补价格": f.needsPrice ? "是" : "否",
      }));

      const buffer = generateExcelExport(rows, "课时费明细", "fees.xlsx");
      return excelResponse(buffer, "fees.xlsx");
    }

    // Default: export courses
    const schedules = await prisma.schedule.findMany({
      where: { userId: session.id },
      include: {
        student: { select: { name: true } },
        courseType: { select: { name: true } },
        courseRecord: { select: { actualDuration: true, content: true, feedback: true } },
        feeRecord: { select: { calculatedAmount: true, finalAmount: true, settlementStatus: true } },
      },
      orderBy: [{ plannedDate: "desc" }, { startTime: "asc" }],
    });

    const rows = schedules.map((s) => ({
      "学生": s.student?.name || "",
      "课程类型": s.courseType?.name || "",
      "日期": s.plannedDate,
      "开始时间": s.startTime,
      "结束时间": s.endTime,
      "计划时长(分钟)": s.plannedDuration,
      "实际时长(分钟)": s.courseRecord?.actualDuration || "",
      "授课内容": s.courseRecord?.content || "",
      "课堂反馈": s.courseRecord?.feedback || "",
      "计划金额": s.feeRecord?.calculatedAmount || "",
      "最终金额": s.feeRecord?.finalAmount || "",
      "结算状态": s.feeRecord?.settlementStatus || "",
      "课程状态": s.status,
      "地点": s.location || "",
      "备注": s.notes || "",
    }));

    const buffer = generateExcelExport(rows, "课程明细", "courses.xlsx");
    return excelResponse(buffer, "courses.xlsx");
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
