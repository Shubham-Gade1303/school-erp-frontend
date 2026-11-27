import axios from "axios";
import type { FeeCollection } from "../types/dashboard";
import {
  getAcademicYears,
  getClassSections,
  getAllFeePayments,
  getAllStudentFees,
  getStandards,
} from "./admissionService";
import type { FeePayment, StudentFee } from "../types/admission";
import { getAllStudents } from "./studentService";
import { getAllTeachers } from "./teacherService";

export interface DashboardCounts {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
}

async function loadDashboardResource<T>(
  resource: string,
  request: Promise<T>,
): Promise<T> {
  try {
    return await request;
  } catch (error) {
    const detail = axios.isAxiosError(error)
      ? error.response?.status
        ? `HTTP ${error.response.status}`
        : error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
    throw new Error(`Unable to load ${resource}: ${detail}.`, { cause: error });
  }
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [
    studentsResponse,
    teachersResponse,
    academicYearsResponse,
    standardsResponse,
  ] = await Promise.all([
    loadDashboardResource("students", getAllStudents()),
    loadDashboardResource("teachers", getAllTeachers()),
    loadDashboardResource("academic years", getAcademicYears()),
    loadDashboardResource("standards", getStandards()),
  ]);
  const activeAcademicYear = academicYearsResponse.data.find(
    (academicYear) => academicYear.active,
  );

  const classSections = activeAcademicYear
    ? await Promise.all(
        standardsResponse.data.map((standard) =>
          loadDashboardResource(
            `class sections for ${standard.standardName}`,
            getClassSections(activeAcademicYear.id, standard.id),
          ),
        ),
      )
    : [];

  return {
    totalStudents: studentsResponse.data.length,
    totalTeachers: teachersResponse.data.length,
    totalClasses: classSections.reduce(
      (total, response) =>
        total +
        response.data.filter(
          (section) => !("active" in section) || section.active !== false,
        ).length,
      0,
    ),
  };
}

export async function getFeeCollection(month: string): Promise<FeeCollection[]> {
  const [feesResponse, paymentsResponse] = await Promise.all([
    loadDashboardResource("student fees", getAllStudentFees()),
    loadDashboardResource("fee payments", getAllFeePayments()),
  ]);

  return buildFeeCollection(feesResponse.data, paymentsResponse.data, month);
}

function buildFeeCollection(
  fees: StudentFee[],
  payments: FeePayment[],
  month: string,
): FeeCollection[] {
  const reportEndDate = getMonthEndDate(month);
  const includedFees = fees.filter(
    (fee) => fee.id !== undefined && isOnOrBefore(fee.dueDate, reportEndDate),
  );
  const includedFeeIds = new Set(
    includedFees.flatMap((fee) => (fee.id === undefined ? [] : [fee.id])),
  );
  const collectedByFeeId = new Map<number, number>();

  for (const payment of payments) {
    if (
      !includedFeeIds.has(payment.studentFeeId) ||
      !isOnOrBefore(payment.paymentDate, reportEndDate)
    ) {
      continue;
    }

    const amount = toNonNegativeAmount(payment.amountPaid);
    collectedByFeeId.set(
      payment.studentFeeId,
      (collectedByFeeId.get(payment.studentFeeId) ?? 0) + amount,
    );
  }

  const totalsByType = new Map<
    string,
    { totalAmount: number; collectedAmount: number }
  >();

  for (const fee of includedFees) {
    const feeType = fee.feeType.trim() || "Other";
    const current = totalsByType.get(feeType) ?? {
      totalAmount: 0,
      collectedAmount: 0,
    };
    current.totalAmount += toNonNegativeAmount(fee.amount);
    current.collectedAmount += collectedByFeeId.get(fee.id ?? -1) ?? 0;
    totalsByType.set(feeType, current);
  }

  return Array.from(totalsByType, ([feeType, amounts]) => ({
    feeType,
    ...amounts,
    percentage:
      amounts.totalAmount > 0
        ? Math.min((amounts.collectedAmount / amounts.totalAmount) * 100, 100)
        : 0,
  }));
}

function getMonthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return "9999-12-31";
  }

  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function isOnOrBefore(date: string, endDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= endDate;
}

function toNonNegativeAmount(value: number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0;
}
