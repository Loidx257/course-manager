import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getToday, getTomorrow, getCurrentMonth, getMonthRange, formatDuration, formatCurrency } from "@/lib/date-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";
import { Plus, Clock, BookOpen, AlertCircle, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return null;

  const today = getToday();
  const tomorrow = getTomorrow();
  const { year, month } = getCurrentMonth();
  const { start, end } = getMonthRange(year, month);

  let todaySchedules: any[] = [];
  let tomorrowSchedules: any[] = [];
  let monthStats: { _sum: { finalAmount: number | null } | null } = { _sum: null };
  let pendingRecords: any[] = [];
  let recentSchedules: any[] = [];
  let monthScheduleCount = 0;
  let monthTotalMinutes = 0;

  try {
    const results = await Promise.all([
      prisma.schedule.findMany({
        where: { userId: session.id, plannedDate: today, status: { notIn: ["cancelled", "rescheduled"] } },
        include: { student: { select: { name: true } }, courseType: { select: { name: true, color: true } } },
        orderBy: { startTime: "asc" },
      }),
      prisma.schedule.findMany({
        where: { userId: session.id, plannedDate: tomorrow, status: { notIn: ["cancelled", "rescheduled"] } },
        include: { student: { select: { name: true } }, courseType: { select: { name: true, color: true } } },
        orderBy: { startTime: "asc" },
      }),
      prisma.feeRecord.aggregate({
        where: {
          userId: session.id,
          needsPrice: false,
          schedule: { plannedDate: { gte: start, lte: end } },
        },
        _sum: { finalAmount: true },
      }),
      prisma.schedule.findMany({
        where: { userId: session.id, status: "completed", courseRecord: null },
        include: { student: { select: { name: true } }, courseType: { select: { name: true } } },
        take: 5,
        orderBy: { plannedDate: "desc" },
      }),
      prisma.schedule.findMany({
        where: { userId: session.id, status: "pending", plannedDate: { gte: today } },
        include: { student: { select: { name: true } }, courseType: { select: { name: true, color: true } } },
        orderBy: [{ plannedDate: "asc" }, { startTime: "asc" }],
        take: 5,
      }),
    ]);
    [todaySchedules, tomorrowSchedules, monthStats, pendingRecords, recentSchedules] = results;

    monthScheduleCount = await prisma.schedule.count({
      where: {
        userId: session.id,
        status: "completed",
        plannedDate: { gte: start, lte: end },
      },
    });

    const monthDurationAgg = await prisma.courseRecord.aggregate({
      where: {
        schedule: {
          userId: session.id,
          plannedDate: { gte: start, lte: end },
          status: "completed",
        },
      },
      _sum: { actualDuration: true },
    });

    monthTotalMinutes = monthDurationAgg._sum?.actualDuration || 0;
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
  }

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/schedules/new"
          className="flex items-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> 新增排课
        </Link>
        <Link
          href="/students/new"
          className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <Plus className="w-4 h-4" /> 添加学生
        </Link>
        <Link
          href="/records"
          className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <BookOpen className="w-4 h-4" /> 补录记录
        </Link>
        <Link
          href="/statistics"
          className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <Clock className="w-4 h-4" /> 查看统计
        </Link>
      </div>

      {/* Month overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">本月课次</div>
          <div className="text-2xl font-bold text-gray-900">{monthScheduleCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">本月课时</div>
          <div className="text-2xl font-bold text-gray-900">{formatDuration(monthTotalMinutes)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">本月预计课时费</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(monthStats._sum?.finalAmount || 0)}
          </div>
        </div>
      </div>

      {/* Today's courses */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            今日课程 ({today})
          </h2>
          <Link href="/calendar" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            日历视图 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {todaySchedules.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">今日暂无课程安排</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todaySchedules.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.courseType.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {s.student.name} · {s.courseType.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.startTime}-{s.endTime} · {formatDuration(s.plannedDuration)}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tomorrow preview */}
      {tomorrowSchedules.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">明日课程 ({tomorrow})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {tomorrowSchedules.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.courseType.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {s.student.name} · {s.courseType.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.startTime}-{s.endTime} · {formatDuration(s.plannedDuration)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending tasks */}
      {pendingRecords.length > 0 && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-3">
            <AlertCircle className="w-4 h-4" /> 待处理提醒
          </div>
          <div className="space-y-2">
            {pendingRecords.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}/complete`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-orange-700">
                  {s.student.name} · {s.courseType.name} ({s.plannedDate}) — 课程已完成但尚未填写记录
                </span>
                <span className="text-orange-600 text-xs shrink-0">去填写 →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {recentSchedules.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">即将到来</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentSchedules.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.courseType.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {s.student.name} · {s.courseType.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.plannedDate} {s.startTime}-{s.endTime}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
