"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { Plus, Receipt } from "lucide-react";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettlements();
  }, []);

  async function fetchSettlements() {
    try {
      const res = await fetch("/api/settlements");
      if (res.ok) {
        setSettlements(await res.json());
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">结算管理</h2>
        <Link
          href="/settlements/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 新建结算
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">加载中...</div>
        ) : settlements.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            暂无结算记录，点击"新建结算"开始
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {settlements.map((s) => (
              <Link
                key={s.id}
                href={`/settlements/${s.id}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {s.studentName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(s.periodStart)} ~ {formatDate(s.periodEnd)} · {s.feeCount} 节课
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(s.actualAmount)}
                    </div>
                  </div>
                  <StatusBadge status={s.status} type="settlement" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
