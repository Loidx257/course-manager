"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { CourseProgress } from "@/components/shared/course-progress";
import { Plus, Search } from "lucide-react";

interface StudentListItem {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  wechat?: string | null;
  examYear?: number | null;
  targetUniversity?: string | null;
  targetMajor?: string | null;
  studentCourses: Array<{
    id: string;
    courseType?: { name: string } | null;
  }>;
  progress?: {
    completedMinutes: number;
    totalMinutes: number | null;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchStudents() {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/students?${params}`);
      if (res.ok && !cancelled) {
        setStudents(await res.json());
      }
      if (!cancelled) setLoading(false);
    }

    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">学生管理</h2>
        <Link
          href="/students/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 添加学生
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索姓名、手机号、院校..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">全部状态</option>
          <option value="active">在读</option>
          <option value="paused">暂停</option>
          <option value="completed">结课</option>
          <option value="archived">归档</option>
        </select>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">加载中...</div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            暂无学生数据，点击上方按钮添加
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <StatusBadge status={s.status} type="student" />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {s.targetUniversity && `${s.targetUniversity}`}
                    {s.targetMajor && ` · ${s.targetMajor}`}
                    {s.examYear && ` · ${s.examYear}年考研`}
                    {!s.targetUniversity && !s.examYear && (s.phone || s.wechat || "暂无详细信息")}
                  </div>
                  {s.studentCourses?.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {s.studentCourses.map((sc) => (
                        <span
                          key={sc.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {sc.courseType?.name || "课程"}
                        </span>
                      ))}
                    </div>
                  )}
                  </div>
                  <CourseProgress
                    completedMinutes={s.progress?.completedMinutes || 0}
                    totalMinutes={s.progress?.totalMinutes}
                  />
                </div>
                <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
