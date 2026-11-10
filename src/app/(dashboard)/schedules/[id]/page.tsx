"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDuration, formatCurrency } from "@/lib/date-utils";
import { safeJson } from "@/lib/fetch-utils";
import { COURSE_STATUS_MAP } from "@/types";
import { Edit, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [params.id]);

  async function fetchSchedule() {
    const res = await fetch(`/api/schedules/${params.id}`);
    if (res.ok) {
      setSchedule(await res.json());
    } else {
      router.push("/calendar");
    }
    setLoading(false);
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === schedule.status) return;
    setChanging(true);
    try {
      const res = await fetch(`/api/schedules/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchSchedule();
      } else {
        const data = await safeJson(res, { error: "更新失败" });
        alert(data.error || "更新失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setChanging(false);
    }
  }

  async function handleCancel() {
    const res = await fetch(`/api/schedules/${params.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "手动取消" }),
    });
    if (res.ok) {
      fetchSchedule();
    }
    setShowCancel(false);
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!schedule) return null;

  const isPending = schedule.status === "pending";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">课程详情</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={schedule.status} />
          <select
            value={schedule.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={changing}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            {Object.entries(COURSE_STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Planned info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">计划信息</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">学生：</span>{schedule.student?.name}</div>
          <div><span className="text-gray-500">课程类型：</span>{schedule.courseType?.name}</div>
          <div><span className="text-gray-500">日期：</span>{schedule.plannedDate}</div>
          <div><span className="text-gray-500">时间：</span>{schedule.startTime} - {schedule.endTime}</div>
          <div><span className="text-gray-500">计划时长：</span>{formatDuration(schedule.plannedDuration)}</div>
          <div><span className="text-gray-500">上课地点：</span>{schedule.location || "未设置"}</div>
          {schedule.onlineLink && <div className="col-span-2"><span className="text-gray-500">线上链接：</span>{schedule.onlineLink}</div>}
          {schedule.notes && <div className="col-span-2"><span className="text-gray-500">备注：</span>{schedule.notes}</div>}
          {schedule.repeatRule && <div className="col-span-2"><span className="text-gray-500">重复：</span>{schedule.repeatRule}</div>}
        </div>
      </div>

      {/* Actual record */}
      {schedule.courseRecord && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">实际上课记录</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">实际时长：</span>{formatDuration(schedule.courseRecord.actualDuration || 0)}</div>
            {schedule.courseRecord.actualStartTime && (
              <div><span className="text-gray-500">开始时间：</span>{schedule.courseRecord.actualStartTime}</div>
            )}
            {schedule.courseRecord.actualEndTime && (
              <div><span className="text-gray-500">结束时间：</span>{schedule.courseRecord.actualEndTime}</div>
            )}
          </div>
          {schedule.courseRecord.content && (
            <div className="mt-3 text-sm"><span className="text-gray-500">授课内容：</span>{schedule.courseRecord.content}</div>
          )}
          {schedule.courseRecord.feedback && (
            <div className="mt-2 text-sm"><span className="text-gray-500">课堂反馈：</span>{schedule.courseRecord.feedback}</div>
          )}
          {schedule.courseRecord.homework && (
            <div className="mt-2 text-sm"><span className="text-gray-500">作业：</span>{schedule.courseRecord.homework}</div>
          )}
        </div>
      )}

      {/* Fee info */}
      {schedule.feeRecord && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">费用信息</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">计算金额</div>
              <div className="font-medium">{formatCurrency(schedule.feeRecord.calculatedAmount)}</div>
            </div>
            {schedule.feeRecord.adjustedAmount !== null && (
              <div>
                <div className="text-gray-500 text-xs">调整金额</div>
                <div className="font-medium">{formatCurrency(schedule.feeRecord.adjustedAmount)}</div>
              </div>
            )}
            <div>
              <div className="text-gray-500 text-xs">最终金额</div>
              <div className="font-bold text-lg">{formatCurrency(schedule.feeRecord.finalAmount)}</div>
            </div>
          </div>
          {schedule.feeRecord.adjustmentReason && (
            <div className="mt-2 text-sm text-gray-500">调整原因：{schedule.feeRecord.adjustmentReason}</div>
          )}
          {schedule.feeRecord.needsPrice && (
            <div className="mt-2 text-sm text-orange-600">⚠ 待补价格 — 未配置有效计费规则</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isPending && (
          <>
            <Link
              href={`/schedules/${schedule.id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" /> 修改排课
            </Link>
            <Link
              href={`/schedules/${schedule.id}/complete`}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" /> 完成课程
            </Link>
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" /> 取消课程
            </button>
          </>
        )}
        {schedule.status === "completed" && !schedule.courseRecord && (
          <Link
            href={`/schedules/${schedule.id}/complete`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            <Clock className="w-4 h-4" /> 补录课程记录
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={showCancel}
        title="取消课程"
        message="确定要取消此课程吗？取消后提醒将自动停止。"
        variant="warning"
        confirmLabel="确认取消"
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  );
}
