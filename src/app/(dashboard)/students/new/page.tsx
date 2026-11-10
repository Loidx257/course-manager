"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeJson } from "@/lib/fetch-utils";

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    wechat: "",
    examYear: "",
    targetUniversity: "",
    targetMajor: "",
    examSubjects: "",
    totalCourseHours: "",
    notes: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("请输入学生姓名");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/students", {
      method: "POST",
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
      router.push("/students");
      router.refresh();
    } else {
      const data = await safeJson(res, { error: "服务器错误，请稍后重试" });
      setError(data.error || "创建失败");
    }
    setSaving(false);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">添加学生</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>姓名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} placeholder="学生姓名" required />
          </div>
          <div>
            <label className={labelClass}>昵称</label>
            <input type="text" value={form.nickname} onChange={(e) => updateField("nickname", e.target.value)} className={inputClass} placeholder="可选" />
          </div>
          <div>
            <label className={labelClass}>手机号</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} placeholder="11位手机号" />
          </div>
          <div>
            <label className={labelClass}>微信</label>
            <input type="text" value={form.wechat} onChange={(e) => updateField("wechat", e.target.value)} className={inputClass} placeholder="微信号" />
          </div>
          <div>
            <label className={labelClass}>报考年份</label>
            <input type="number" value={form.examYear} onChange={(e) => updateField("examYear", e.target.value)} className={inputClass} placeholder="如 2026" min={2020} max={2030} />
          </div>
          <div>
            <label className={labelClass}>目标院校</label>
            <input type="text" value={form.targetUniversity} onChange={(e) => updateField("targetUniversity", e.target.value)} className={inputClass} placeholder="目标院校名称" />
          </div>
          <div>
            <label className={labelClass}>目标专业</label>
            <input type="text" value={form.targetMajor} onChange={(e) => updateField("targetMajor", e.target.value)} className={inputClass} placeholder="目标专业" />
          </div>
          <div>
            <label className={labelClass}>考试科目</label>
            <input type="text" value={form.examSubjects} onChange={(e) => updateField("examSubjects", e.target.value)} className={inputClass} placeholder="多个科目用逗号分隔" />
          </div>
          <div>
            <label className={labelClass}>总课时（小时）</label>
            <input type="number" value={form.totalCourseHours} onChange={(e) => updateField("totalCourseHours", e.target.value)} className={inputClass} placeholder="如 30" min={0.25} max={10000} step={0.25} />
          </div>
        </div>

        <div>
          <label className={labelClass}>备注</label>
          <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className={inputClass} rows={3} placeholder="其他备注信息" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
