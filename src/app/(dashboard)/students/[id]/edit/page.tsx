"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";

interface StudentForm {
  name: string;
  nickname: string;
  phone: string;
  wechat: string;
  examYear: string;
  targetUniversity: string;
  targetMajor: string;
  examSubjects: string;
  totalCourseHours: string;
  notes: string;
  status: string;
}

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<StudentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/students/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          name: data.name || "",
          nickname: data.nickname || "",
          phone: data.phone || "",
          wechat: data.wechat || "",
          examYear: data.examYear ? String(data.examYear) : "",
          targetUniversity: data.targetUniversity || "",
          targetMajor: data.targetMajor || "",
          examSubjects: data.examSubjects || "",
          totalCourseHours: data.totalCourseMinutes ? String(data.totalCourseMinutes / 60) : "",
          notes: data.notes || "",
          status: data.status || "active",
        });
      } else {
        router.push("/students");
      }
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/students/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        examYear: form.examYear ? parseInt(form.examYear) : null,
        totalCourseMinutes: form.totalCourseHours
          ? Math.round(parseFloat(form.totalCourseHours) * 60)
          : null,
        totalCourseHours: undefined,
      }),
    });

    if (res.ok) {
      router.push(`/students/${params.id}`);
      router.refresh();
    } else {
      const data = await safeJson(res, { error: "服务器错误，请稍后重试" });
      setError(data.error || "保存失败");
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!form) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">编辑学生</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>姓名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>状态</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
              <option value="active">在读</option>
              <option value="paused">暂停</option>
              <option value="completed">结课</option>
              <option value="archived">归档</option>
            </select>
          </div>
          <div><label className={labelClass}>昵称</label><input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>手机号</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>微信</label><input type="text" value={form.wechat} onChange={(e) => setForm({ ...form, wechat: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>报考年份</label><input type="number" value={form.examYear} onChange={(e) => setForm({ ...form, examYear: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>目标院校</label><input type="text" value={form.targetUniversity} onChange={(e) => setForm({ ...form, targetUniversity: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>目标专业</label><input type="text" value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>考试科目</label><input type="text" value={form.examSubjects} onChange={(e) => setForm({ ...form, examSubjects: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>总课时（小时）</label><input type="number" value={form.totalCourseHours} onChange={(e) => setForm({ ...form, totalCourseHours: e.target.value })} className={inputClass} min={0.25} max={10000} step={0.25} placeholder="如 30" /></div>
        </div>
        <div><label className={labelClass}>备注</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={3} /></div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
        </div>
      </form>
    </div>
  );
}
