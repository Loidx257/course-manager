"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";

export default function NewSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<any[]>([]);
  const [courseTypes, setCourseTypes] = useState<any[]>([]);
  const [form, setForm] = useState({
    studentId: searchParams.get("studentId") || "",
    courseTypeId: "",
    plannedDate: searchParams.get("date") || new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    plannedDuration: 60,
    repeatRule: "",
    location: "",
    onlineLink: "",
    notes: "",
    reminderEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch("/api/students?status=active"),
          fetch("/api/course-types"),
        ]);
        if (cancelled) return;
        const [s, c] = await Promise.all([
          sRes.ok ? sRes.json() : Promise.resolve([]),
          cRes.ok ? cRes.json() : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setStudents(Array.isArray(s) ? s : []);
          setCourseTypes(Array.isArray(c) ? c.filter((ct: any) => ct.status === "active") : []);
        }
      } catch {
        // Silently handle fetch errors for initial data load
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Auto-calculate end time
  const endTime = (() => {
    const [h, m] = form.startTime.split(":").map(Number);
    const totalMin = h * 60 + m + form.plannedDuration;
    const eh = Math.floor(totalMin / 60) % 24;
    const em = totalMin % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  const selectedCourseType = courseTypes.find((c) => c.id === form.courseTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConflicts([]);

    if (!form.studentId || !form.courseTypeId) {
      setError("请选择学生和课程类型");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await safeJson<{ error?: string; conflicts?: any[] }>(res, { error: "服务器错误，请稍后重试" });
    if (res.ok) {
      router.push("/calendar");
      router.refresh();
    } else if (res.status === 409) {
      setError("时间冲突");
      setConflicts(data.conflicts || []);
    } else {
      setError(data.error || "创建失败");
    }
    setSaving(false);
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">新增排课</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-700 font-medium">{error}</div>
          {conflicts.length > 0 && (
            <div className="mt-2 space-y-1">
              {conflicts.map((c, i) => (
                <div key={i} className="text-xs text-red-600">
                  冲突：{c.studentName} · {c.courseTypeName} ({c.startTime}-{c.endTime})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>学生 <span className="text-red-500">*</span></label>
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={inputClass} required>
              <option value="">选择学生</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>课程类型 <span className="text-red-500">*</span></label>
            <select value={form.courseTypeId} onChange={(e) => setForm({ ...form, courseTypeId: e.target.value })} className={inputClass} required>
              <option value="">选择课程类型</option>
              {courseTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>日期 <span className="text-red-500">*</span></label>
            <input type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>开始时间 <span className="text-red-500">*</span></label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>预计时长（分钟）<span className="text-red-500">*</span></label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.plannedDuration}
                onChange={(e) => setForm({ ...form, plannedDuration: parseInt(e.target.value) || 60 })}
                className={inputClass}
                min={15} max={720} step={15}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">→ {endTime}</span>
            </div>
            {selectedCourseType?.defaultDuration && (
              <button
                type="button"
                onClick={() => setForm({ ...form, plannedDuration: selectedCourseType.defaultDuration! })}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                使用默认时长 ({selectedCourseType.defaultDuration}分钟)
              </button>
            )}
          </div>

          <div>
            <label className={labelClass}>重复规则</label>
            <select value={form.repeatRule} onChange={(e) => setForm({ ...form, repeatRule: e.target.value })} className={inputClass}>
              <option value="">不重复</option>
              <option value='{"freq":"weekly","interval":1}'>每周重复</option>
              <option value='{"freq":"weekly","interval":2}'>每两周重复</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>上课地点</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} placeholder="教室地址或线上" />
          </div>
        </div>

        <div>
          <label className={labelClass}>线上链接</label>
          <input type="text" value={form.onlineLink} onChange={(e) => setForm({ ...form, onlineLink: e.target.value })} className={inputClass} placeholder="腾讯会议/钉钉链接" />
        </div>

        <div>
          <label className={labelClass}>备注</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={2} placeholder="其他备注" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reminder" checked={form.reminderEnabled} onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })} className="rounded" />
          <label htmlFor="reminder" className="text-sm text-gray-700">开启上课提醒</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "创建中..." : "创建排课"}
          </button>
        </div>
      </form>
    </div>
  );
}
