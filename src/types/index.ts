export interface Student {
  id: string;
  userId: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  wechat: string | null;
  examYear: number | null;
  targetUniversity: string | null;
  targetMajor: string | null;
  examSubjects: string | null;
  totalCourseMinutes: number | null;
  status: string;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentCourses?: StudentCourse[];
  schedules?: Schedule[];
}

export interface CourseType {
  id: string;
  userId: string;
  name: string;
  subject: string | null;
  format: string;
  defaultDuration: number | null;
  billingMethod: string;
  billingUnit: string | null;
  unitMinutes: number | null;
  defaultPrice: number | null;
  color: string;
  status: string;
}

export interface StudentCourse {
  id: string;
  studentId: string;
  courseTypeId: string;
  defaultPrice: number | null;
  defaultDuration: number | null;
  billingUnit: string | null;
  courseType?: CourseType;
}

export interface Schedule {
  id: string;
  userId: string;
  studentId: string;
  courseTypeId: string;
  plannedDate: string;
  startTime: string;
  endTime: string;
  plannedDuration: number;
  repeatRule: string | null;
  repeatGroupId: string | null;
  location: string | null;
  onlineLink: string | null;
  notes: string | null;
  reminderEnabled: boolean;
  status: string;
  cancelReason: string | null;
  student?: Student;
  courseType?: CourseType;
  courseRecord?: CourseRecord | null;
  feeRecord?: FeeRecord | null;
}

export interface CourseRecord {
  id: string;
  scheduleId: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDuration: number | null;
  content: string | null;
  feedback: string | null;
  homework: string | null;
  attachments: string | null;
}

export interface FeeRecord {
  id: string;
  scheduleId: string;
  userId: string;
  calculatedAmount: number;
  adjustedAmount: number | null;
  finalAmount: number;
  adjustmentReason: string | null;
  billingRule: string | null;
  settlementStatus: string;
  settlementId: string | null;
  needsPrice: boolean;
  schedule?: Schedule;
}

export interface ReminderTask {
  id: string;
  scheduleId: string;
  remindAt: string;
  channel: string;
  status: string;
  failReason: string | null;
  sentAt: string | null;
}

export interface Settlement {
  id: string;
  userId: string;
  studentId: string | null;
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  actualAmount: number;
  status: string;
  notes: string | null;
  student?: Student;
  feeRecords?: FeeRecord[];
}

export interface SystemSetting {
  id: string;
  userId: string;
  defaultBillingBasis: string;
  minBillingUnit: number;
  roundingMethod: string;
  minBillingDuration: number | null;
  overtimeHandling: string;
  defaultReminderMinutes: number;
  reminderTime: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    studentName: string;
    courseTypeName: string;
    status: string;
    location?: string;
  };
}

export const COURSE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待上课", color: "bg-blue-100 text-blue-800" },
  in_progress: { label: "进行中", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800" },
  absent: { label: "请假/缺席", color: "bg-orange-100 text-orange-800" },
  rescheduled: { label: "已调课", color: "bg-purple-100 text-purple-800" },
};

export const SETTLEMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  unsettled: { label: "未结算", color: "bg-gray-100 text-gray-800" },
  partial: { label: "部分结算", color: "bg-yellow-100 text-yellow-800" },
  settled: { label: "已结算", color: "bg-green-100 text-green-800" },
  confirmed: { label: "已结算", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已撤销", color: "bg-red-100 text-red-800" },
};

export const STUDENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "在读", color: "bg-green-100 text-green-800" },
  paused: { label: "暂停", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "结课", color: "bg-blue-100 text-blue-800" },
  archived: { label: "归档", color: "bg-gray-100 text-gray-800" },
};
