"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CourseProgress } from "@/components/shared/course-progress";
import { formatDuration, formatCurrency } from "@/lib/date-utils";
import { safeJson } from "@/lib/fetch-utils";
import { Edit, Trash2, Plus } from "lucide-react";

interface StudentDetail {
  id: string;
  name: string;
  nickname?: string | null;
  phone?: string | null;
  wechat?: string | null;
  examYear?: number | null;
  targetUniversity?: string | null;
  targetMajor?: string | null;
  examSubjects?: string | null;
  status: string;
  notes?: string | null;
  stats?: {
    totalLessons: number;
    totalDuration: number;
    totalFees: number;
    unsettledFees: number;
  };
  progress?: {
    completedMinutes: number;
    totalMinutes: number | null;
  };
  studentCourses: Array<{
    id: string;
    defaultDuration?: number | null;
    defaultPrice?: number | null;
    courseType?: { name: string } | null;
  }>;
  schedules: Array<{
    id: string;
    plannedDate: string;
    startTime: string;
    endTime: string;
    status: string;
    courseType?: { name: string; color: string } | null;
    feeRecord?: { finalAmount: number } | null;
  }>;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStudent() {
      try {
        const res = await fetch(`/api/students/${params.id}`);
        if (res.ok) {
          if (!cancelled) setStudent(await res.json());
        } else {
          router.push("/students");
        }
      } catch {
        // Network error — stay on page
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStudent();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  async function handleDelete() {
    try {
      const res = await fetch(`/api/students/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/students");
        router.refresh();
      } else {
        const data = await safeJson(res, { error: "删除失败" });
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络错误，请稍后重试");
    } finally {
      setShowDelete(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">加载中...</div>;
  if (!student) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{student.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={student.status} type="student" />
            {student.nickname && <span className="text-sm text-gray-500">({student.nickname})</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/students/${student.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" /> 编辑
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> 删除
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">累计课次</div>
          <div className="text-xl font-bold">{student.stats?.totalLessons || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">累计课时</div>
          <div className="text-xl font-bold">{formatDuration(student.stats?.totalDuration || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">累计费用</div>
          <div className="text-xl font-bold">{formatCurrency(student.stats?.totalFees || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">未结算</div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(student.stats?.unsettledFees || 0)}</div>
        </div>
      </div>

      {/* Course progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">课时进度</h3>
        <CourseProgress
          completedMinutes={student.progress?.completedMinutes || 0}
          totalMinutes={student.progress?.totalMinutes}
        />
        {!student.progress?.totalMinutes && (
          <Link href={`/students/${student.id}/edit`} className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700">
            设置总课时
          </Link>
        )}
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {student.phone && <div><span className="text-gray-500">手机：</span>{student.phone}</div>}
          {student.wechat && <div><span className="text-gray-500">微信：</span>{student.wechat}</div>}
          {student.examYear && <div><span className="text-gray-500">报考年份：</span>{student.examYear}年</div>}
          {student.targetUniversity && <div><span className="text-gray-500">目标院校：</span>{student.targetUniversity}</div>}
          {student.targetMajor && <div><span className="text-gray-500">目标专业：</span>{student.targetMajor}</div>}
          {student.examSubjects && <div><span className="text-gray-500">考试科目：</span>{student.examSubjects}</div>}
          {student.notes && <div className="col-span-2"><span className="text-gray-500">备注：</span>{student.notes}</div>}
        </div>
      </div>

      {/* Course configs */}
      {student.studentCourses?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">课程配置</h3>
          <div className="space-y-2">
            {student.studentCourses.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{sc.courseType?.name}</span>
                <span className="text-gray-500">
                  {sc.defaultDuration && `${sc.defaultDuration}分钟 · `}
                  {sc.defaultPrice ? formatCurrency(sc.defaultPrice) : "未设置价格"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule history */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">课程记录</h3>
          <Link
            href={`/schedules/new?studentId=${student.id}`}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3 h-3" /> 排课
          </Link>
        </div>
        {student.schedules?.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">暂无课程记录</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {student.schedules?.map((s) => (
              <Link
                key={s.id}
                href={`/schedules/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: s.courseType?.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{s.courseType?.name}</div>
                  <div className="text-xs text-gray-500">{s.plannedDate} {s.startTime}-{s.endTime}</div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={s.status} />
                  {(s.feeRecord?.finalAmount ?? 0) > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">{formatCurrency(s.feeRecord?.finalAmount ?? 0)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        title="删除学生"
        message={`确定要删除学生"${student.name}"吗？删除后可在回收站恢复。`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
