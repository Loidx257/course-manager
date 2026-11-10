export interface BillingInput {
  actualDuration: number; // minutes
  billingMethod: string; // per_hour | per_unit | per_session | fixed
  unitMinutes?: number; // e.g. 45, 50, 60
  pricePerUnit?: number; // price per hour/unit/session
  fixedAmount?: number; // for fixed billing method
  roundingMethod?: string; // exact | round_up | round | round_down
  minBillingUnit?: number; // minimum billing unit in minutes
}

export interface BillingResult {
  calculatedAmount: number;
  billingRule: string;
  needsPrice: boolean;
}

export function calculateFee(input: BillingInput): BillingResult {
  const {
    actualDuration,
    billingMethod,
    unitMinutes = 60,
    pricePerUnit,
    fixedAmount,
    roundingMethod = "exact",
    minBillingUnit = 15,
  } = input;

  // If no price configured, mark as needing price
  if (
    billingMethod !== "fixed" &&
    (pricePerUnit === undefined || pricePerUnit === null || pricePerUnit === 0)
  ) {
    return {
      calculatedAmount: 0,
      billingRule: JSON.stringify({ method: billingMethod, reason: "no_price_configured" }),
      needsPrice: true,
    };
  }

  if (billingMethod === "fixed" && (fixedAmount === undefined || fixedAmount === null)) {
    return {
      calculatedAmount: 0,
      billingRule: JSON.stringify({ method: "fixed", reason: "no_fixed_amount" }),
      needsPrice: true,
    };
  }

  let roundedDuration = actualDuration;

  // Apply minimum billing unit rounding
  if (minBillingUnit > 1) {
    roundedDuration = roundDuration(actualDuration, minBillingUnit, roundingMethod);
  }

  let amount = 0;
  const rule: Record<string, unknown> = {
    method: billingMethod,
    actualDuration,
    roundedDuration,
    roundingMethod,
  };

  switch (billingMethod) {
    case "per_hour":
      // Fee = (minutes / 60) × hourly rate
      amount = (roundedDuration / 60) * (pricePerUnit || 0);
      rule.hourlyRate = pricePerUnit;
      break;

    case "per_unit":
      // Fee = (minutes / unitMinutes) × unit price
      amount = (roundedDuration / (unitMinutes || 60)) * (pricePerUnit || 0);
      rule.unitMinutes = unitMinutes;
      rule.unitPrice = pricePerUnit;
      break;

    case "per_session":
      // Fixed fee per session regardless of duration
      amount = pricePerUnit || 0;
      rule.sessionPrice = pricePerUnit;
      break;

    case "fixed":
      // Directly specified amount
      amount = fixedAmount || 0;
      rule.fixedAmount = fixedAmount;
      break;

    default:
      amount = 0;
      rule.reason = "unknown_method";
  }

  // Round to 2 decimal places
  amount = Math.round(amount * 100) / 100;

  return {
    calculatedAmount: amount,
    billingRule: JSON.stringify(rule),
    needsPrice: false,
  };
}

function roundDuration(
  duration: number,
  unit: number,
  method: string
): number {
  switch (method) {
    case "round_up":
      return Math.ceil(duration / unit) * unit;
    case "round":
      return Math.round(duration / unit) * unit;
    case "round_down":
      return Math.floor(duration / unit) * unit;
    case "exact":
    default:
      return duration;
  }
}

/**
 * Determine the effective billing configuration for a schedule.
 * Priority (highest to lowest):
 * 1. Schedule-level manual price override (fixed billing method)
 * 2. Student's personal course price
 * 3. Course type default price
 * 4. No price → needsPrice
 */
export function resolveBillingConfig(params: {
  scheduleFixedAmount?: number | null;
  studentCoursePrice?: number | null;
  studentCourseBillingUnit?: string | null;
  courseTypePrice?: number | null;
  courseTypeBillingMethod?: string | null;
  courseTypeUnitMinutes?: number | null;
}): {
  billingMethod: string;
  pricePerUnit?: number;
  unitMinutes?: number;
  fixedAmount?: number;
  needsPrice: boolean;
} {
  const { scheduleFixedAmount, studentCoursePrice, studentCourseBillingUnit,
    courseTypePrice, courseTypeBillingMethod, courseTypeUnitMinutes } = params;

  // Priority 1: Schedule-level fixed amount
  if (scheduleFixedAmount !== null && scheduleFixedAmount !== undefined && scheduleFixedAmount > 0) {
    return {
      billingMethod: "fixed",
      fixedAmount: scheduleFixedAmount,
      needsPrice: false,
    };
  }

  // Priority 2: Student's personal course price
  if (studentCoursePrice !== null && studentCoursePrice !== undefined && studentCoursePrice > 0) {
    const unit = studentCourseBillingUnit || "per_hour";
    const unitMinutes = unit === "unit_45min" ? 45 : unit === "unit_50min" ? 50 : 60;
    const billingMethod = unit === "per_session" ? "per_session" :
      unit === "unit_45min" || unit === "unit_50min" ? "per_unit" : "per_hour";

    return {
      billingMethod,
      pricePerUnit: studentCoursePrice,
      unitMinutes,
      needsPrice: false,
    };
  }

  // Priority 3: Course type default price
  if (courseTypePrice !== null && courseTypePrice !== undefined && courseTypePrice > 0) {
    return {
      billingMethod: courseTypeBillingMethod || "per_hour",
      pricePerUnit: courseTypePrice,
      unitMinutes: courseTypeUnitMinutes || 60,
      needsPrice: false,
    };
  }

  // Priority 4: No price configured
  return {
    billingMethod: courseTypeBillingMethod || "per_hour",
    needsPrice: true,
  };
}
