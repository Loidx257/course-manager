"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDuration, formatCurrency } from "@/lib/date-utils";
import { safeJson } from "@/lib/fetch-utils";
import { Search } from "lucide-react";

export default function RecordsPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, studentFilter]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (studentFilter) params.set("studentId", studentFilter);

      const res = await fetch(`/api/schedules?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (search) {
          setSchedules(data.filter((s: any) =>
            s.student?.name?.includes(search) ||
            s.courseType?.name?.includes(search) ||
            s.plannedDate?.includes(search)
          ));
        } else {
          setSchedules(data);
        }
      }
    } catch {
      // Silently handle fetch errors — data stays empty
    } finally {
      setLoading(false);
    }
  }

  // Filter display
  const displayed = schedules;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">课程记录</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索学生、课程、日期..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRecords()}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">全部状态</option>
          <option value="pending">待上课</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
          <option value="absent">请假/缺席</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">加载中...</div>
        ) : displayed.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">暂无记录</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayed.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: s.courseType?.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {s.student?.name} · {s.courseType?.name}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {s.plannedDate} {s.startTime}-{s.endTime} · {formatDuration(s.plannedDuration)}
                    {s.courseRecord?.actualDuration && ` · 实际${formatDuration(s.courseRecord.actualDuration)}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {s.feeRecord?.finalAmount > 0 && (
                    <div className="text-sm font-medium">{formatCurrency(s.feeRecord.finalAmount)}</div>
                  )}
                  {s.feeRecord?.settlementStatus && (
                    <div className="text-xs text-gray-400">
                      {s.feeRecord.settlementStatus === "settled" ? "已结算" :
                       s.feeRecord.settlementStatus === "partial" ? "部分结算" : "未结算"}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
