import { prisma } from "./prisma";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface ConflictResult {
  hasConflict: boolean;
  conflicts: {
    id: string;
    studentName: string;
    courseTypeName: string;
    startTime: string;
    endTime: string;
  }[];
}

export async function checkScheduleConflict(
  userId: string,
  plannedDate: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<ConflictResult> {
  const where: Record<string, unknown> = {
    userId,
    plannedDate,
    status: { notIn: ["cancelled", "rescheduled"] },
  };

  if (excludeScheduleId) {
    where.id = { not: excludeScheduleId };
  }

  const overlappingSchedules = await prisma.schedule.findMany({
    where: where as any,
    include: {
      student: { select: { name: true } },
      courseType: { select: { name: true } },
    },
  });

  const conflicts = overlappingSchedules.filter((s) => {
    return startTime < s.endTime && endTime > s.startTime;
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts.map((c) => ({
      id: c.id,
      studentName: c.student.name,
      courseTypeName: c.courseType.name,
      startTime: c.startTime,
      endTime: c.endTime,
    })),
  };
}

export function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function calculateDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  // Handle cross-midnight
  if (endMinutes <= startMinutes) {
    return endMinutes + 24 * 60 - startMinutes;
  }
  return endMinutes - startMinutes;
}
