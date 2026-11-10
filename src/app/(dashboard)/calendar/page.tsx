"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDuration } from "@/lib/date-utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  useEffect(() => {
    fetchSchedules();
  }, [currentDate, view]);

  async function fetchSchedules() {
    setLoading(true);
    const { start, end } = getDateRange();
    const res = await fetch(`/api/schedules?startDate=${start}&endDate=${end}`);
    if (res.ok) {
      setSchedules(await res.json());
    }
    setLoading(false);
  }

  function getDateRange() {
    const d = new Date(currentDate);
    if (view === "month") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    } else if (view === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: fmt(new Date(monday)), end: fmt(new Date(sunday)) };
    } else {
      return { start: fmt(d), end: fmt(d) };
    }
  }

  function fmt(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function getTitle(): string {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (view === "month") return `${y}年${m + 1}月`;
    if (view === "week") {
      const { start, end } = getDateRange();
      return `${start} ~ ${end}`;
    }
    return fmt(currentDate);
  }

  // Month view days
  const monthDays = (() => {
    if (view !== "month") return [];
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    // getDay() returns 0=Sun, convert to Monday-based: 0=Mon, 6=Sun
    const jsDay = new Date(y, m, 1).getDay();
    const firstDay = jsDay === 0 ? 6 : jsDay - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(y, m, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, prevMonthDays - i);
      days.push({ date: fmt(d), day: prevMonthDays - i, isCurrentMonth: false, isToday: fmt(d) === fmt(new Date()) });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(y, m, i);
      days.push({ date: fmt(d), day: i, isCurrentMonth: true, isToday: fmt(d) === fmt(new Date()) });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(y, m + 1, i);
        days.push({ date: fmt(d), day: i, isCurrentMonth: false, isToday: false });
      }
    }

    return days;
  })();

  // Week view days
  const weekDays = (() => {
    if (view !== "week") return [];
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const days: { date: string; label: string; isToday: boolean }[] = [];
    const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];
    for (let i = 0; i < 7; i++) {
      const date = new Date(d);
      date.setDate(d.getDate() + i);
      days.push({ date: fmt(date), label: `周${dayLabels[i]} ${date.getDate()}`, isToday: fmt(date) === fmt(new Date()) });
    }
    return days;
  })();

  function getSchedulesForDate(date: string) {
    return schedules.filter((s) => s.plannedDate === date && s.status !== "cancelled" && s.status !== "rescheduled");
  }

  const STATUS_CLASS: Record<string, string> = {
    pending: "bg-blue-100 border-blue-300 text-blue-800",
    in_progress: "bg-yellow-100 border-yellow-300 text-yellow-800",
    completed: "bg-green-100 border-green-300 text-green-800",
    absent: "bg-orange-100 border-orange-300 text-orange-800",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">{getTitle()}</h2>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => { setCurrentDate(new Date()); }} className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
            今天
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  view === v ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {{ month: "月", week: "周", day: "日" }[v]}
              </button>
            ))}
          </div>
          <Link
            href="/schedules/new"
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> 排课
          </Link>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">加载中...</div>
        ) : (
          <>
            {/* Month view */}
            {view === "month" && (
              <div>
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((d, i) => (
                    <div
                      key={i}
                      className={`min-h-[80px] border-b border-r border-gray-100 p-1 ${
                        d.isCurrentMonth ? "" : "bg-gray-50"
                      } ${d.isToday ? "bg-blue-50/50" : ""}`}
                      onClick={() => {
                        if (d.isCurrentMonth) {
                          router.push(`/schedules/new?date=${d.date}`);
                        }
                      }}
                    >
                      <div className={`text-xs mb-1 ${d.isToday ? "font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center" : "text-gray-500"}`}>
                        {d.day}
                      </div>
                      <div className="space-y-0.5">
                        {getSchedulesForDate(d.date).slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className={`text-xs px-1 py-0.5 rounded border cursor-pointer truncate ${STATUS_CLASS[s.status] || "bg-gray-100 border-gray-200"}`}
                            onClick={(e) => { e.stopPropagation(); router.push(`/schedules/${s.id}`); }}
                            title={`${s.student?.name} - ${s.courseType?.name}`}
                          >
                            {s.startTime} {s.student?.name}
                          </div>
                        ))}
                        {getSchedulesForDate(d.date).length > 3 && (
                          <div className="text-xs text-gray-400 pl-1">+{getSchedulesForDate(d.date).length - 3} 更多</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Week view */}
            {view === "week" && (
              <div>
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {weekDays.map((d) => (
                    <div key={d.date} className={`py-2 text-center text-xs ${d.isToday ? "font-bold text-blue-600" : "text-gray-500"}`}>
                      <div>{d.label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7" style={{ minHeight: "400px" }}>
                  {weekDays.map((d) => (
                    <div key={d.date} className={`border-r border-gray-100 p-1 ${d.isToday ? "bg-blue-50/30" : ""}`}>
                      {getSchedulesForDate(d.date).map((s) => (
                        <div
                          key={s.id}
                          className={`text-xs px-1 py-1 mb-1 rounded border cursor-pointer ${STATUS_CLASS[s.status] || "bg-gray-100 border-gray-200"}`}
                          onClick={() => router.push(`/schedules/${s.id}`)}
                        >
                          <div className="font-medium">{s.startTime}</div>
                          <div className="truncate">{s.student?.name}</div>
                          <div className="truncate text-gray-500">{s.courseType?.name}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day view */}
            {view === "day" && (
              <div className="divide-y divide-gray-100">
                {getSchedulesForDate(fmt(currentDate)).length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">当天暂无课程</div>
                ) : (
                  getSchedulesForDate(fmt(currentDate)).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/schedules/${s.id}`)}
                    >
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.courseType?.color }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{s.student?.name} · {s.courseType?.name}</div>
                        <div className="text-xs text-gray-500">{s.startTime}-{s.endTime} · {formatDuration(s.plannedDuration)}</div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
