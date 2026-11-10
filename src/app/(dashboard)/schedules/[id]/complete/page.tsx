"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";

export default function CompleteCoursePage() {
  const params = useParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    actualStartTime: "",
    actualEndTime: "",
    actualDuration: 60,
    content: "",
    feedback: "",
    homework: "",
    feeAdjustment: "",
    adjustmentReason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSchedule() {
      const res = await fetch(`/api/schedules/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
        setForm((f) => ({
          ...f,
          actualStartTime: data.startTime || "",
          actualEndTime: data.endTime || "",
          actualDuration: data.plannedDuration || 60,
        }));
      }
      setLoading(false);
    }
    fetchSchedule();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.actualDuration < 1) {
      setError("实际时长必须大于0");
      return;
    }
    if (!form.content.trim()) {
      setError("请填写授课内容");
      return;
    }
    if (form.feeAdjustment && !form.adjustmentReason.trim()) {
      setError("调整费用时请填写调整原因");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch(`/api/schedules/${params.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualStartTime: form.actualStartTime || undefined,
        actualEndTime: form.actualEndTime || undefined,
        actualDuration: form.actualDuration,
        content: form.content,
        feedback: form.feedback || undefined,
        homework: form.homework || undefined,
        feeAdjustment: form.feeAdjustment ? parseFloat(form.feeAdjustment) : undefined,
        adjustmentReason: form.adjustmentReason || undefined,
      }),
    });

    if (res.ok) {
      router.push(`/schedules/${params.id}`);
      router.refresh();
    } else {
      const data = await safeJson(res, { error: "服务器错误，请稍后重试" });
      setError(data.error || "保存失败");
    }
    setSaving(false);
  }

  function updateDurationFromTime() {
    if (form.actualStartTime && form.actualEndTime) {
      const [sh, sm] = form.actualStartTime.split(":").map(Number);
      const [eh, em] = form.actualEndTime.split(":").map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      setForm((f) => ({ ...f, actualDuration: mins }));
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!schedule) return <div className="p-6 text-center text-gray-500">课程不存在</div>;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">完成课程</h2>
      <div className="text-sm text-gray-500">
        {schedule.student?.name} · {schedule.courseType?.name} · {schedule.plannedDate} {schedule.startTime}-{schedule.endTime}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>实际开始时间</label>
            <input type="time" value={form.actualStartTime} onChange={(e) => setForm({ ...form, actualStartTime: e.target.value })} onBlur={updateDurationFromTime} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>实际结束时间</label>
            <input type="time" value={form.actualEndTime} onChange={(e) => setForm({ ...form, actualEndTime: e.target.value })} onBlur={updateDurationFromTime} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>实际时长（分钟）<span className="text-red-500">*</span></label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.actualDuration} onChange={(e) => setForm({ ...form, actualDuration: parseInt(e.target.value) || 0 })} className={inputClass} min={1} max={720} />
            <span className="text-xs text-gray-500 whitespace-nowrap">{Math.floor(form.actualDuration / 60)}h {form.actualDuration % 60}m</span>
          </div>
          <div className="flex gap-2 mt-1">
            {[30, 45, 60, 90, 120, 150, 180].map((d) => (
              <button key={d} type="button" onClick={() => setForm({ ...form, actualDuration: d })} className="text-xs px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-50">
                {d}min
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>授课内容 <span className="text-red-500">*</span></label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={inputClass}
            rows={4}
            placeholder="记录本次授课的科目、章节、知识点和讲解内容"
            required
          />
        </div>

        <div>
          <label className={labelClass}>课堂反馈</label>
          <textarea
            value={form.feedback}
            onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            className={inputClass}
            rows={3}
            placeholder="学生表现、掌握情况、存在问题、下次重点"
          />
        </div>

        <div>
          <label className={labelClass}>作业</label>
          <textarea
            value={form.homework}
            onChange={(e) => setForm({ ...form, homework: e.target.value })}
            className={inputClass}
            rows={2}
            placeholder="布置作业、截止时间"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">费用调整（可选）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>调整后金额</label>
              <input
                type="number"
                value={form.feeAdjustment}
                onChange={(e) => setForm({ ...form, feeAdjustment: e.target.value })}
                className={inputClass}
                min={0}
                step={0.01}
                placeholder="留空则自动计算"
              />
            </div>
            <div>
              <label className={labelClass}>调整原因</label>
              <input
                type="text"
                value={form.adjustmentReason}
                onChange={(e) => setForm({ ...form, adjustmentReason: e.target.value })}
                className={inputClass}
                placeholder="如：赠送课、优惠等"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "保存中..." : "确认完成"}
          </button>
        </div>
      </form>
    </div>
  );
}
