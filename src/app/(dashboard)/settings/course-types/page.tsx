"use client";

import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { safeJson } from "@/lib/fetch-utils";
import { Plus, Edit, Trash2 } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

export default function CourseTypesPage() {
  const [courseTypes, setCourseTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    format: "one_on_one",
    defaultDuration: "",
    billingMethod: "per_hour",
    billingUnit: "",
    unitMinutes: "",
    defaultPrice: "",
    color: "#3B82F6",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTypes(); }, []);

  async function fetchTypes() {
    const res = await fetch("/api/course-types");
    if (res.ok) setCourseTypes(await res.json());
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", subject: "", format: "one_on_one", defaultDuration: "", billingMethod: "per_hour", billingUnit: "", unitMinutes: "", defaultPrice: "", color: "#3B82F6" });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(ct: any) {
    setForm({
      name: ct.name,
      subject: ct.subject || "",
      format: ct.format || "one_on_one",
      defaultDuration: ct.defaultDuration || "",
      billingMethod: ct.billingMethod || "per_hour",
      billingUnit: ct.billingUnit || "",
      unitMinutes: ct.unitMinutes || "",
      defaultPrice: ct.defaultPrice || "",
      color: ct.color || "#3B82F6",
    });
    setEditId(ct.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const body = {
        ...form,
        billingUnit: form.billingUnit || null,
        defaultDuration: form.defaultDuration ? parseInt(form.defaultDuration) : null,
        unitMinutes: form.unitMinutes ? parseInt(form.unitMinutes) : null,
        defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : null,
      };

      const url = editId ? `/api/course-types/${editId}` : "/api/course-types";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        fetchTypes();
        resetForm();
      } else {
        const data = await safeJson(res, { error: "保存失败" });
        alert(data.error || "保存失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/course-types/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await safeJson(res, { error: "删除失败" });
        alert(data.error || "删除失败");
        return;
      }
    } catch {
      alert("网络错误，请稍后重试");
      return;
    }
    setDeleteId(null);
    fetchTypes();
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">课程类型管理</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 添加课程类型
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">{editId ? "编辑课程类型" : "新增课程类型"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>课程名称 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="如：数学强化" required />
            </div>
            <div>
              <label className={labelClass}>科目</label>
              <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} placeholder="如：数学" />
            </div>
            <div>
              <label className={labelClass}>授课形式</label>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={inputClass}>
                <option value="one_on_one">一对一</option>
                <option value="small_group">小班</option>
                <option value="qa">答疑</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>默认时长（分钟）</label>
              <input type="number" value={form.defaultDuration} onChange={(e) => setForm({ ...form, defaultDuration: e.target.value })} className={inputClass} min={15} max={720} placeholder="如：60" />
            </div>
            <div>
              <label className={labelClass}>计费方式</label>
              <select value={form.billingMethod} onChange={(e) => setForm({ ...form, billingMethod: e.target.value })} className={inputClass}>
                <option value="per_hour">按小时</option>
                <option value="per_unit">按课时单位</option>
                <option value="per_session">按次</option>
                <option value="fixed">固定金额</option>
              </select>
            </div>
            {form.billingMethod === "per_unit" && (
              <div>
                <label className={labelClass}>课时单位</label>
                <select value={form.billingUnit} onChange={(e) => setForm({ ...form, billingUnit: e.target.value, unitMinutes: e.target.value === "unit_45min" ? "45" : "50" })} className={inputClass}>
                  <option value="">选择单位</option>
                  <option value="unit_45min">45分钟/课时</option>
                  <option value="unit_50min">50分钟/课时</option>
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>默认单价（元）</label>
              <input type="number" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} className={inputClass} min={0} step={0.01} placeholder="如：200" />
            </div>
            <div>
              <label className={labelClass}>颜色标签</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">加载中...</div>
        ) : courseTypes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">暂无课程类型</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {courseTypes.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ct.color }} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ct.name}</div>
                    <div className="text-xs text-gray-500">
                      {ct.subject && `${ct.subject} · `}
                      {ct.format === "one_on_one" ? "一对一" : ct.format === "small_group" ? "小班" : "答疑"} · {ct.defaultDuration ? `${ct.defaultDuration}分钟` : "无默认时长"} · ¥{ct.defaultPrice || "未定价"}
                      {ct.status === "inactive" && " · 已停用"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(ct)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(ct.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="停用课程类型"
        message="停用后不可新建排课，但历史数据保留。确认停用？"
        variant="warning"
        confirmLabel="确认停用"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
