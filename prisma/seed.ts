import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await hash("123456", 12);
  const user = await prisma.user.upsert({
    where: { phone: "13800138000" },
    update: {},
    create: {
      name: "张老师",
      phone: "13800138000",
      passwordHash,
    },
  });

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      defaultBillingBasis: "actual",
      minBillingUnit: 15,
      roundingMethod: "exact",
      defaultReminderMinutes: 1200,
      reminderTime: "20:00",
    },
  });

  // Create course types
  const courseTypes = await Promise.all([
    prisma.courseType.create({
      data: {
        userId: user.id,
        name: "数学强化",
        subject: "数学",
        format: "one_on_one",
        defaultDuration: 90,
        billingMethod: "per_hour",
        defaultPrice: 200,
        color: "#3B82F6",
      },
    }),
    prisma.courseType.create({
      data: {
        userId: user.id,
        name: "英语阅读",
        subject: "英语",
        format: "one_on_one",
        defaultDuration: 60,
        billingMethod: "per_hour",
        defaultPrice: 180,
        color: "#10B981",
      },
    }),
    prisma.courseType.create({
      data: {
        userId: user.id,
        name: "专业课一",
        subject: "专业课",
        format: "one_on_one",
        defaultDuration: 120,
        billingMethod: "per_unit",
        billingUnit: "unit_45min",
        unitMinutes: 45,
        defaultPrice: 150,
        color: "#8B5CF6",
      },
    }),
    prisma.courseType.create({
      data: {
        userId: user.id,
        name: "模考复盘",
        subject: "综合",
        format: "one_on_one",
        defaultDuration: 60,
        billingMethod: "per_session",
        defaultPrice: 300,
        color: "#F59E0B",
      },
    }),
    prisma.courseType.create({
      data: {
        userId: user.id,
        name: "答疑",
        subject: "综合",
        format: "qa",
        defaultDuration: 30,
        billingMethod: "per_hour",
        defaultPrice: 150,
        color: "#06B6D4",
      },
    }),
  ]);

  // Create students
  const studentData = [
    { name: "李明", examYear: 2026, targetUniversity: "清华大学", targetMajor: "计算机科学", examSubjects: "数学一,英语一,政治,408计算机基础", status: "active" as const },
    { name: "王小红", examYear: 2026, targetUniversity: "北京大学", targetMajor: "金融学", examSubjects: "数学三,英语一,政治,金融学综合", status: "active" as const, phone: "13900139001" },
    { name: "张伟", examYear: 2025, targetUniversity: "浙江大学", targetMajor: "机械工程", examSubjects: "数学一,英语一,政治,机械设计", status: "active" as const },
    { name: "赵丽", examYear: 2026, targetUniversity: "复旦大学", targetMajor: "新闻传播", examSubjects: "英语一,政治,新闻传播基础", status: "active" as const },
    { name: "陈强", examYear: 2026, targetUniversity: "上海交通大学", targetMajor: "电子信息", examSubjects: "数学一,英语一,政治,信号与系统", status: "active" as const, phone: "13900139002" },
    { name: "刘佳", examYear: 2025, targetUniversity: "南京大学", targetMajor: "化学", examSubjects: "英语一,政治,有机化学,无机化学", status: "paused" as const },
    { name: "周文", examYear: 2026, targetUniversity: "武汉大学", targetMajor: "法学", examSubjects: "英语一,政治,法学综合", status: "active" as const },
    { name: "吴婷", examYear: 2026, targetUniversity: "中山大学", targetMajor: "临床医学", examSubjects: "英语一,政治,西医综合", status: "active" as const },
    { name: "郑浩", examYear: 2025, targetUniversity: "西安交通大学", targetMajor: "电气工程", examSubjects: "数学一,英语一,政治,电路", status: "completed" as const },
    { name: "孙悦", examYear: 2026, targetUniversity: "南开大学", targetMajor: "经济学", examSubjects: "数学三,英语一,政治,经济学基础", status: "active" as const },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.student.create({ data: { ...s, userId: user.id } })
    )
  );

  // Create student-course associations (personal pricing)
  await prisma.studentCourse.create({
    data: {
      studentId: students[0].id,
      courseTypeId: courseTypes[0].id,
      defaultPrice: 220,
      defaultDuration: 90,
    },
  });

  await prisma.studentCourse.create({
    data: {
      studentId: students[1].id,
      courseTypeId: courseTypes[0].id,
      defaultPrice: 200,
      defaultDuration: 60,
    },
  });

  // Create schedules (past 30 days, today, and future)
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - 20 + i);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const student = students[i % students.length];
    const courseType = courseTypes[i % courseTypes.length];
    const hour = 9 + (i % 3) * 3;
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const duration = courseType.defaultDuration || 60;

    // Calculate end time
    const totalMin = hour * 60 + duration;
    const eh = Math.floor(totalMin / 60) % 24;
    const em = totalMin % 60;
    const endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

    const dateStr = fmt(date);
    const isPast = date < today;

    const schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        studentId: student.id,
        courseTypeId: courseType.id,
        plannedDate: dateStr,
        startTime,
        endTime,
        plannedDuration: duration,
        status: isPast ? "completed" : "pending",
        location: i % 3 === 0 ? "教室A301" : i % 3 === 1 ? "线上" : null,
        onlineLink: i % 3 === 1 ? "https://meeting.tencent.com/xxx" : null,
        notes: i % 5 === 0 ? "带模拟试卷" : null,
      },
    });

    // Complete past courses
    if (isPast) {
      const actualDuration = duration + Math.floor(Math.random() * 30) - 15;
      const actualStart = startTime;
      const totalMin2 = hour * 60 + actualDuration;
      const eh2 = Math.floor(totalMin2 / 60) % 24;
      const em2 = totalMin2 % 60;
      const actualEnd = `${String(eh2).padStart(2, "0")}:${String(em2).padStart(2, "0")}`;

      await prisma.courseRecord.create({
        data: {
          scheduleId: schedule.id,
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          actualDuration: Math.max(1, actualDuration),
          content: `本次授课讲解了${courseType.subject || "相关"}知识点，重点突破${i % 3 === 0 ? "基础概念" : i % 3 === 1 ? "解题技巧" : "综合应用"}。`,
          feedback: i % 3 === 0 ? "掌握较好，继续加油" : i % 3 === 1 ? "需要加强练习" : "进步明显",
          homework: i % 2 === 0 ? `完成${courseType.name}练习第${i + 1}章` : null,
        },
      });

      // Calculate fee
      const billingMethod = courseType.billingMethod;
      const actualMin = Math.max(1, actualDuration);
      let calculatedAmount = 0;

      if (billingMethod === "per_hour") {
        calculatedAmount = Math.round((actualMin / 60) * (courseType.defaultPrice || 200) * 100) / 100;
      } else if (billingMethod === "per_unit") {
        calculatedAmount = Math.round((actualMin / (courseType.unitMinutes || 45)) * (courseType.defaultPrice || 150) * 100) / 100;
      } else if (billingMethod === "per_session") {
        calculatedAmount = courseType.defaultPrice || 300;
      }

      const needsPrice = calculatedAmount === 0;

      await prisma.feeRecord.create({
        data: {
          scheduleId: schedule.id,
          userId: user.id,
          calculatedAmount,
          finalAmount: calculatedAmount,
          billingRule: JSON.stringify({ method: billingMethod, duration: actualMin }),
          settlementStatus: i < 15 ? "settled" : "unsettled",
          needsPrice,
        },
      });
    }
  }

  console.log("Seed complete!");
  console.log("Test account: 13800138000 / 123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
