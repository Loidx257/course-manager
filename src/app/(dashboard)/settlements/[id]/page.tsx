"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency, formatDuration, formatDate } from "@/lib/date-utils";
import { safeJson } from "@/lib/fetch-utils";
import { ArrowLeft } from "lucide-react";

export default function SettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    fetchSettlement();
  }, [params.id]);

  async function fetchSettlement() {
    try {
      const res = await fetch(`/api/settlements/${params.id}`);
      if (res.ok) {
        setSettlement(await res.json());
      } else {
        router.push("/settlements");
      }
    } catch {
      // stay on page
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      const res = await fetch(`/api/settlements/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/settlements");
        router.refresh();
      } else {
        const data = await safeJson(res, { error: "撤销失败" });
        alert(data.error || "撤销失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setShowCancel(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!settlement) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">结算详情</h2>
            <div className="text-sm text-gray-500">
              {settlement.student?.name || "全部学生"} · {formatDate(settlement.periodStart)} ~ {formatDate(settlement.periodEnd)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={settlement.status} type="settlement" />
          {settlement.status === "confirmed" && (
            <button
              onClick={() => setShowCancel(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              撤销结算
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">课程数</div>
          <div className="text-xl font-bold">{settlement.feeRecords?.length || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">计算金额</div>
          <div className="text-xl font-bold">{formatCurrency(settlement.expectedAmount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">实际金额</div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(settlement.actualAmount)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">创建时间</div>
          <div className="text-sm font-semibold">{formatDate(settlement.createdAt)}</div>
        </div>
      </div>

      {settlement.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">备注</div>
          <div className="text-sm text-gray-700">{settlement.notes}</div>
        </div>
      )}

      {/* Fee Records Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">费用明细</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {settlement.feeRecords?.map((fr: any) => (
            <div key={fr.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-1 h-10 rounded-full shrink-0"
                style={{ backgroundColor: fr.schedule?.courseType?.color || "#ccc" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">
                  {fr.schedule?.student?.name} · {fr.schedule?.courseType?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {fr.schedule?.plannedDate} · 实际时长 {formatDuration(fr.schedule?.courseRecord?.actualDuration || 0)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium">{formatCurrency(fr.finalAmount)}</div>
                {fr.adjustedAmount !== null && (
                  <div className="text-xs text-gray-400">
                    {fr.adjustmentReason || "手动调整"} · 原 {formatCurrency(fr.calculatedAmount)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        title="撤销结算"
        message={'撤销后所有关联的费用将恢复为"未结算"状态，确认撤销？'}
        variant="danger"
        confirmLabel="确认撤销"
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  );
}
