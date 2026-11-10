"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";
import { formatCurrency, formatDuration } from "@/lib/date-utils";
import { Search } from "lucide-react";

export default function NewSettlementPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [fees, setFees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/students?status=active");
        if (res.ok) setStudents(await res.json());
      } catch {}
    }
    load();
  }, []);

  async function handleQuery() {
    if (!periodStart || !periodEnd) {
      setError("请选择日期范围");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("settlementStatus", "unsettled");
      if (studentId) params.set("studentId", studentId);
      params.set("startDate", periodStart);
      params.set("endDate", periodEnd);

      const res = await fetch(`/api/fees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFees(data);
        setSelectedIds(new Set(data.map((f: any) => f.id)));
      }
    } catch {
      setError("查询失败");
    } finally {
      setLoading(false);
    }
  }

  function toggleFee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === fees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fees.map((f: any) => f.id)));
    }
  }

  const selectedFees = fees.filter((f) => selectedIds.has(f.id));
  const totalCount = selectedFees.length;
  const totalDuration = selectedFees.reduce((s, f) => s + (f.schedule?.courseRecord?.actualDuration || 0), 0);
  const totalExpected = selectedFees.reduce((s, f) => s + f.calculatedAmount, 0);
  const totalActual = selectedFees.reduce((s, f) => s + f.finalAmount, 0);

  async function handleSubmit() {
    if (selectedIds.size === 0) {
      setError("请至少选择一条费用记录");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId || null,
          periodStart,
          periodEnd,
          notes,
          feeIds: Array.from(selectedIds),
        }),
      });
      const data = await safeJson<{ error?: string; id?: string }>(res, { error: "创建失败" });
      if (res.ok && data.id) {
        router.push(`/settlements/${data.id}`);
        router.refresh();
      } else {
        setError(data.error || "创建失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">新建结算</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>学生（可选）</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
              <option value="">全部学生</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>开始日期 <span className="text-red-500">*</span></label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>结束日期 <span className="text-red-500">*</span></label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          onClick={handleQuery}
          disabled={loading}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Search className="w-4 h-4" /> {loading ? "查询中..." : "查询未结算费用"}
        </button>
      </div>

      {/* Fee list */}
      {fees.length > 0 && (
        <>
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                匹配到 {fees.length} 条未结算费用
              </h3>
              <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-700">
                {selectedIds.size === fees.length ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {fees.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleFee(f.id)}
                    className="rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {f.schedule?.student?.name} · {f.schedule?.courseType?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {f.schedule?.plannedDate} · 实际时长 {formatDuration(f.schedule?.courseRecord?.actualDuration || 0)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">{formatCurrency(f.finalAmount)}</div>
                    {f.adjustedAmount !== null && (
                      <div className="text-xs text-gray-400 line-through">{formatCurrency(f.calculatedAmount)}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">结算汇总</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">课次数</div>
                <div className="text-lg font-bold">{totalCount}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">总时长</div>
                <div className="text-lg font-bold">{formatDuration(totalDuration)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">计算金额</div>
                <div className="text-lg font-bold">{formatCurrency(totalExpected)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">实际金额</div>
                <div className="text-lg font-bold text-green-700">{formatCurrency(totalActual)}</div>
              </div>
            </div>
            <div>
              <label className={labelClass}>备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
                rows={2}
                placeholder="结算备注（可选）"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "创建中..." : `确认结算 (${totalCount} 条)`}
            </button>
          </div>
        </>
      )}

      {fees.length === 0 && !loading && periodStart && periodEnd && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
          该日期范围内没有未结算的费用记录
        </div>
      )}
    </div>
  );
}
