import type { Student } from "../types/student";
import type { StudentMarksRecord } from "../types/studentRecords";

export type ResultStatus = "PASS" | "FAIL" | "NOT_APPEARED";
export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export interface StudentResult {
  student: Student;
  marks: StudentMarksRecord[];
  totalObtained: number;
  totalMaximum: number;
  percentage: number | null;
  grade: Grade | null;
  status: ResultStatus;
}

export interface SectionResult {
  sectionId: number;
  sectionName: string;
  totalStudents: number;
  appeared: number;
  passed: number;
  failed: number;
  passPercentage: number | null;
  averagePercentage: number | null;
}

export interface SubjectResult {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  studentsWithMarks: number;
  averageMarks: number;
  maximumMarks: number;
  averagePercentage: number;
}

export function buildStudentResults(
  students: Student[],
  marks: StudentMarksRecord[],
): StudentResult[] {
  const marksByStudent = groupMarksByStudent(marks);
  return students
    .filter((student) => student.active)
    .map((student) => calculateStudentResult(student, marksByStudent.get(student.id) ?? []));
}

export function buildSectionResults(
  sections: Array<{ id: number; sectionName: string }>,
  students: Student[],
  results: StudentResult[],
): SectionResult[] {
  const resultsByStudent = new Map(results.map((result) => [result.student.id, result]));
  return sections.map((section) => {
    const sectionStudents = students.filter(
      (student) => student.active && student.classSectionId === section.id,
    );
    const sectionResults = sectionStudents
      .map((student) => resultsByStudent.get(student.id))
      .filter((result): result is StudentResult => Boolean(result));
    const appearedResults = sectionResults.filter((result) => result.status !== "NOT_APPEARED");
    const passed = appearedResults.filter((result) => result.status === "PASS").length;
    return {
      sectionId: section.id,
      sectionName: section.sectionName,
      totalStudents: sectionStudents.length,
      appeared: appearedResults.length,
      passed,
      failed: appearedResults.length - passed,
      passPercentage: safePercentage(passed, appearedResults.length),
      averagePercentage: average(appearedResults.map((result) => result.percentage).filter(isNumber)),
    };
  });
}

export function getGradeDistribution(results: StudentResult[]) {
  const distribution: Record<Grade, number> = {
    "A+": 0,
    A: 0,
    "B+": 0,
    B: 0,
    "C+": 0,
    C: 0,
    D: 0,
    F: 0,
  };
  results.forEach((result) => {
    if (result.grade) distribution[result.grade] += 1;
  });
  return distribution;
}

export function getSubjectResults(marks: StudentMarksRecord[]): SubjectResult[] {
  const grouped = new Map<number, StudentMarksRecord[]>();
  marks.forEach((mark) => {
    const current = grouped.get(mark.subjectId) ?? [];
    current.push(mark);
    grouped.set(mark.subjectId, current);
  });
  return [...grouped.entries()]
    .map(([subjectId, subjectMarks]) => {
      const first = subjectMarks[0];
      return {
        subjectId,
        subjectName: first.subjectName ?? `Subject ${subjectId}`,
        subjectCode: first.subjectCode ?? "—",
        studentsWithMarks: new Set(subjectMarks.map((mark) => mark.studentId)).size,
        averageMarks: average(subjectMarks.map((mark) => mark.marksObtained)),
        maximumMarks: Math.max(...subjectMarks.map((mark) => toNumber(mark.maximumMarks))),
        averagePercentage: average(subjectMarks.map((mark) => subjectPercentage(mark))),
      };
    })
    .sort((first, second) => first.subjectName.localeCompare(second.subjectName));
}

export function calculateGrade(percentage: number): Grade {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  if (percentage >= 35) return "D";
  return "F";
}

export function calculateStudentResult(
  student: Student,
  marks: StudentMarksRecord[],
): StudentResult {
  const totalObtained = marks.reduce((sum, mark) => sum + toNumber(mark.marksObtained), 0);
  const totalMaximum = marks.reduce((sum, mark) => sum + toNumber(mark.maximumMarks), 0);
  const percentage = totalMaximum > 0 ? (totalObtained / totalMaximum) * 100 : null;
  return {
    student,
    marks,
    totalObtained,
    totalMaximum,
    percentage,
    grade: percentage === null ? null : calculateGrade(percentage),
    status: percentage === null ? "NOT_APPEARED" : percentage >= 35 ? "PASS" : "FAIL",
  };
}

export function groupMarksByStudent(marks: StudentMarksRecord[]) {
  const grouped = new Map<number, StudentMarksRecord[]>();
  marks.forEach((mark) => {
    const current = grouped.get(mark.studentId) ?? [];
    current.push(mark);
    grouped.set(mark.studentId, current);
  });
  return grouped;
}

function subjectPercentage(mark: StudentMarksRecord) {
  const maximum = toNumber(mark.maximumMarks);
  return maximum > 0 ? (toNumber(mark.marksObtained) / maximum) * 100 : null;
}

function average(values: Array<number | null | undefined>) {
  const validValues = values.filter(isNumber);
  return validValues.length ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length : 0;
}

function safePercentage(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 100 : null;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
