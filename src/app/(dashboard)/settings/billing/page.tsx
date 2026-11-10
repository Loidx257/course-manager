"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { safeJson } from "@/lib/fetch-utils";

export default function BillingSettingsPage() {
  const [settings, setSettings] = useState({
    defaultBillingBasis: "actual",
    minBillingUnit: 15,
    roundingMethod: "exact",
    minBillingDuration: "",
    overtimeHandling: "actual",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          defaultBillingBasis: data.defaultBillingBasis || "actual",
          minBillingUnit: data.minBillingUnit || 15,
          roundingMethod: data.roundingMethod || "exact",
          minBillingDuration: data.minBillingDuration || "",
          overtimeHandling: data.overtimeHandling || "actual",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        minBillingUnit: parseInt(String(settings.minBillingUnit)),
        minBillingDuration: settings.minBillingDuration ? parseInt(String(settings.minBillingDuration)) : null,
      }),
    });

    if (res.ok) {
      setMessage("保存成功");
    } else {
      const data = await safeJson(res, { error: "保存失败" });
      setMessage(data.error || "保存失败");
    }
    setSaving(false);
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">计费设置</h2>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>计费依据</label>
            <select value={settings.defaultBillingBasis} onChange={(e) => setSettings({ ...settings, defaultBillingBasis: e.target.value })} className={inputClass}>
              <option value="actual">实际时长</option>
              <option value="planned">计划时长</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">建议使用实际时长</p>
          </div>

          <div>
            <label className={labelClass}>最小计费单位（分钟）</label>
            <select value={settings.minBillingUnit} onChange={(e) => setSettings({ ...settings, minBillingUnit: parseInt(e.target.value) })} className={inputClass}>
              <option value={1}>1分钟 — 精确</option>
              <option value={5}>5分钟</option>
              <option value={10}>10分钟</option>
              <option value={15}>15分钟 — 推荐</option>
              <option value={30}>30分钟</option>
              <option value={45}>45分钟（1课时）</option>
              <option value={60}>60分钟（1小时）</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>取整方式</label>
            <select value={settings.roundingMethod} onChange={(e) => setSettings({ ...settings, roundingMethod: e.target.value })} className={inputClass}>
              <option value="exact">精确计算</option>
              <option value="round">四舍五入</option>
              <option value="round_up">向上取整</option>
              <option value="round_down">向下取整</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>最短计费时长（分钟）</label>
            <input type="number" value={settings.minBillingDuration} onChange={(e) => setSettings({ ...settings, minBillingDuration: e.target.value })} className={inputClass} min={0} placeholder="不限制" />
            <p className="text-xs text-gray-400 mt-1">低于此时长不计费，留空不限制</p>
          </div>

          <div>
            <label className={labelClass}>超时处理</label>
            <select value={settings.overtimeHandling} onChange={(e) => setSettings({ ...settings, overtimeHandling: e.target.value })} className={inputClass}>
              <option value="actual">按实际计费</option>
              <option value="cap_at_planned">封顶为计划时长</option>
              <option value="confirm">需确认</option>
            </select>
          </div>
        </div>

        {/* Calculation examples */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">计算示例</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <p>· 按小时：90分钟 × 200元/小时 = 300.00元</p>
            <p>· 按课时：100分钟 ÷ 45分钟/课时 × 100元/课时 = 222.22元（按15分钟取整后105分钟 = 233.33元）</p>
            <p>· 按次：每次300元，不论时长</p>
            <p>· 固定金额：直接指定本次费用</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes("成功") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存设置"}
        </button>
      </div>
    </div>
  );
}
