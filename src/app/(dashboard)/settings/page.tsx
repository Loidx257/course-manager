"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Download, Settings2, BookOpen, Clock, Trash2 } from "lucide-react";
import { safeJson } from "@/lib/fetch-utils";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    defaultBillingBasis: "actual",
    minBillingUnit: 15,
    roundingMethod: "exact",
    minBillingDuration: "",
    overtimeHandling: "actual",
    defaultReminderMinutes: 1200,
    reminderTime: "20:00",
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
          defaultReminderMinutes: data.defaultReminderMinutes || 1200,
          reminderTime: data.reminderTime || "20:00",
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
        defaultReminderMinutes: parseInt(String(settings.defaultReminderMinutes)),
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
      <h2 className="text-lg font-semibold text-gray-900">系统设置</h2>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/settings/course-types"
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">课程类型</div>
            <div className="text-xs text-gray-500">管理课程与计费配置</div>
          </div>
        </Link>
        <Link
          href="/settings/billing"
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Settings2 className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">计费设置</div>
            <div className="text-xs text-gray-500">取整规则与默认值</div>
          </div>
        </Link>
        <button
          onClick={() => {
            fetch("/api/export?type=students").then((r) => r.blob()).then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "students.xlsx";
              a.click();
            });
          }}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
        >
          <Download className="w-5 h-5 text-orange-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">数据导出</div>
            <div className="text-xs text-gray-500">导出全部数据备份</div>
          </div>
        </button>
      </div>

      {/* Reminder settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> 提醒设置
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>默认提醒时间（课前）</label>
            <select
              value={settings.defaultReminderMinutes}
              onChange={(e) => setSettings({ ...settings, defaultReminderMinutes: parseInt(e.target.value) })}
              className={inputClass}
            >
              <option value="60">1小时前</option>
              <option value="120">2小时前</option>
              <option value="180">3小时前</option>
              <option value="360">6小时前</option>
              <option value="720">12小时前</option>
              <option value="1200">20小时前（前一天20:00）</option>
              <option value="1440">24小时前</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>提醒时间点</label>
            <input type="time" value={settings.reminderTime} onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Billing defaults */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> 计费默认值
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>计费依据</label>
            <select value={settings.defaultBillingBasis} onChange={(e) => setSettings({ ...settings, defaultBillingBasis: e.target.value })} className={inputClass}>
              <option value="actual">实际时长</option>
              <option value="planned">计划时长</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>最小计费单位（分钟）</label>
            <select value={settings.minBillingUnit} onChange={(e) => setSettings({ ...settings, minBillingUnit: parseInt(e.target.value) })} className={inputClass}>
              <option value={1}>1分钟</option>
              <option value={5}>5分钟</option>
              <option value={10}>10分钟</option>
              <option value={15}>15分钟</option>
              <option value={30}>30分钟</option>
              <option value={45}>45分钟</option>
              <option value={60}>60分钟</option>
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
