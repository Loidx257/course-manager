"use client";

import { COURSE_STATUS_MAP, SETTLEMENT_STATUS_MAP, STUDENT_STATUS_MAP } from "@/types";

interface StatusBadgeProps {
  status: string;
  type?: "course" | "settlement" | "student";
}

export function StatusBadge({ status, type = "course" }: StatusBadgeProps) {
  const map =
    type === "settlement"
      ? SETTLEMENT_STATUS_MAP
      : type === "student"
      ? STUDENT_STATUS_MAP
      : COURSE_STATUS_MAP;

  const config = map[status] || { label: status, color: "bg-gray-100 text-gray-800" };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
