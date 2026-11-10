import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号").optional().or(z.literal("")),
  email: z.string().email("请输入有效的邮箱").optional().or(z.literal("")),
  password: z.string().min(6, "密码至少6位").max(100),
});

export const loginSchema = z.object({
  phone: z.string().min(1, "请输入手机号"),
  password: z.string().min(1, "请输入密码"),
});

export const studentSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50),
  nickname: z.string().max(50).optional().or(z.literal("")),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号").optional().or(z.literal("")),
  wechat: z.string().max(50).optional().or(z.literal("")),
  examYear: z.number().int().min(2020).max(2030).optional().nullable(),
  targetUniversity: z.string().max(100).optional().or(z.literal("")),
  targetMajor: z.string().max(100).optional().or(z.literal("")),
  examSubjects: z.string().max(200).optional().or(z.literal("")),
  totalCourseMinutes: z.number().int().min(1, "总课时必须大于0").max(600000, "总课时不能超过10000小时").optional().nullable(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const courseTypeSchema = z.object({
  name: z.string().min(1, "课程名称不能为空").max(50),
  subject: z.string().max(50).optional().or(z.literal("")),
  format: z.enum(["one_on_one", "small_group", "qa"]).optional(),
  defaultDuration: z.number().int().min(15).max(720).optional().nullable(),
  billingMethod: z.enum(["per_hour", "per_unit", "per_session", "fixed"]).optional(),
  billingUnit: z.enum(["unit_45min", "unit_50min"]).optional().nullable().or(z.literal("")),
  unitMinutes: z.number().int().optional().nullable(),
  defaultPrice: z.number().min(0).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const scheduleSchema = z.object({
  studentId: z.string().min(1, "请选择学生"),
  courseTypeId: z.string().min(1, "请选择课程类型"),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "请输入有效时间"),
  plannedDuration: z.number().int().min(15, "时长至少15分钟").max(720, "时长不能超过12小时"),
  repeatRule: z.string().optional().nullable().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  onlineLink: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  reminderEnabled: z.boolean().optional(),
});

export const completeCourseSchema = z.object({
  actualStartTime: z.string().regex(/^\d{2}:\d{2}$/, "请输入有效时间").optional().or(z.literal("")),
  actualEndTime: z.string().regex(/^\d{2}:\d{2}$/, "请输入有效时间").optional().or(z.literal("")),
  actualDuration: z.number().int().min(1, "实际时长必须大于0").max(720, "时长不能超过12小时"),
  content: z.string().min(1, "请填写授课内容").max(2000),
  feedback: z.string().max(2000).optional().or(z.literal("")),
  homework: z.string().max(1000).optional().or(z.literal("")),
  feeAdjustment: z.number().min(0).optional().nullable(),
  adjustmentReason: z.string().max(200).optional().or(z.literal("")),
});

export const settlementSchema = z.object({
  studentId: z.string().optional().nullable(),
  periodStart: z.string().min(1, "请选择开始日期"),
  periodEnd: z.string().min(1, "请选择结束日期"),
  notes: z.string().max(500).optional().or(z.literal("")),
  feeIds: z.array(z.string()).min(1, "请至少选择一条费用记录"),
});

export const settingsSchema = z.object({
  defaultBillingBasis: z.enum(["actual", "planned"]).optional(),
  minBillingUnit: z.number().int().min(1).max(60).optional(),
  roundingMethod: z.enum(["exact", "round_up", "round", "round_down"]).optional(),
  minBillingDuration: z.number().int().min(0).optional().nullable(),
  overtimeHandling: z.enum(["actual", "cap_at_planned", "confirm"]).optional(),
  defaultReminderMinutes: z.number().int().min(0).max(10080).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});
