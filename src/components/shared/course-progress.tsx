import { formatDuration } from "@/lib/date-utils";

interface CourseProgressProps {
  completedMinutes: number;
  totalMinutes?: number | null;
}

export function CourseProgress({ completedMinutes, totalMinutes }: CourseProgressProps) {
  const safeCompleted = Math.max(0, completedMinutes || 0);

  if (!totalMinutes) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <span>已上 {formatDuration(safeCompleted)}</span>
          <span>未设置总课时</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100" aria-label="未设置总课时">
          <div className="h-full w-0 rounded-full bg-gray-300" />
        </div>
      </div>
    );
  }

  const rawPercentage = (safeCompleted / totalMinutes) * 100;
  const displayedPercentage = Math.round(rawPercentage);
  const barPercentage = Math.min(100, Math.max(0, rawPercentage));
  const difference = totalMinutes - safeCompleted;

  let barColor = "bg-blue-500";
  if (rawPercentage > 100) barColor = "bg-red-500";
  else if (rawPercentage >= 100) barColor = "bg-green-500";
  else if (rawPercentage >= 80) barColor = "bg-amber-500";

  const statusText =
    difference > 0
      ? `剩余 ${formatDuration(difference)}`
      : difference < 0
        ? `超出 ${formatDuration(Math.abs(difference))}`
        : "已完成";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-600">
          已上 {formatDuration(safeCompleted)} / 总计 {formatDuration(totalMinutes)}
        </span>
        <span className={rawPercentage > 100 ? "font-medium text-red-600" : "text-gray-500"}>
          {displayedPercentage}% · {statusText}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, displayedPercentage)}
        aria-valuetext={`${displayedPercentage}%，${statusText}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${barPercentage}%` }}
        />
      </div>
    </div>
  );
}
