"use client";

import { useState, useEffect } from "react";
import { formatDuration, formatCurrency } from "@/lib/date-utils";
import { Download } from "lucide-react";

export default function StatisticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [year, month]);

  async function fetchStats() {
    setLoading(true);
    const res = await fetch(`/api/statistics?year=${year}&month=${month}`);
    if (res.ok) {
      setStats(await res.json());
    }
    setLoading(false);
  }

  async function handleExport(type: string) {
    const res = await fetch(`/api/export?type=${type}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_${year}${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">统计与结算</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("courses")}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> 导出课程
          </button>
          <button
            onClick={() => handleExport("fees")}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> 导出费用
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}月</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-gray-500">加载中...</div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">已完成课次</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSchedules}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">总课时</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(stats.totalDuration)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">总课时费</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalFees)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">未结算</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(stats.unsettledFees)}</div>
            </div>
          </div>

          {/* Settlement summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">已结算</div>
              <div className="text-lg font-bold text-green-600 mt-1">{formatCurrency(stats.settledFees)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">未结算</div>
              <div className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(stats.unsettledFees)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900">待补价格</div>
              <div className="text-lg font-bold text-red-600 mt-1">{stats.needsPriceCount} 条记录</div>
            </div>
          </div>

          {/* By student */}
          {stats.byStudent?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">按学生汇总</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.byStudent.map((s: any) => (
                  <div key={s.studentId} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">{s.studentName}</span>
                    <div className="flex items-center gap-6 text-gray-500">
                      <span>{s.lessonCount}次课</span>
                      <span>{formatDuration(s.totalDuration)}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(s.totalFees)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
