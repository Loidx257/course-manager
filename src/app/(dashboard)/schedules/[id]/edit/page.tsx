"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [courseTypes, setCourseTypes] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sRes, cRes, scRes] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/course-types"),
          fetch(`/api/schedules/${params.id}`),
        ]);
        const [s, c, sc] = await Promise.all([
          sRes.ok ? sRes.json() : Promise.resolve([]),
          cRes.ok ? cRes.json() : Promise.resolve([]),
          scRes.ok ? scRes.json() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setStudents(Array.isArray(s) ? s : []);
        setCourseTypes(Array.isArray(c) ? c : []);
        if (sc && !sc.error) {
          setForm({
            studentId: sc.studentId || "",
            courseTypeId: sc.courseTypeId || "",
            plannedDate: sc.plannedDate || "",
            startTime: sc.startTime || "09:00",
            plannedDuration: sc.plannedDuration || 60,
            location: sc.location || "",
            onlineLink: sc.onlineLink || "",
            notes: sc.notes || "",
            reminderEnabled: sc.reminderEnabled ?? true,
          });
        }
      } catch {
        if (!cancelled) setError("加载数据失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.courseTypeId) {
      setError("请选择学生和课程类型");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/schedules/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push(`/schedules/${params.id}`);
        router.refresh();
      } else {
        const data = await safeJson(res, { error: "保存失败" });
        setError(data.error || "保存失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!form) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">修改排课</h2>
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>学生 <span className="text-red-500">*</span></label>
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className={inputClass}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>课程类型 <span className="text-red-500">*</span></label>
            <select value={form.courseTypeId} onChange={(e) => setForm({ ...form, courseTypeId: e.target.value })} className={inputClass}>
              {courseTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>日期</label><input type="date" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>开始时间</label><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>时长（分钟）</label><input type="number" value={form.plannedDuration} onChange={(e) => setForm({ ...form, plannedDuration: parseInt(e.target.value) || 60 })} className={inputClass} min={15} max={720} /></div>
          <div><label className={labelClass}>地点</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>备注</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={2} /></div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
        </div>
      </form>
    </div>
  );
}
