import { getAcademicYears, getClassSections, getStandards } from "./admissionService";
import { getExamsByAcademicYearAndStandard } from "../API/examApi";
import { getStudentsByClassSection } from "./studentService";
import {
  getStudentMarksByExam,
  getStudentPerformanceByExam,
} from "./studentRecordsService";

export {
  getAcademicYears,
  getClassSections,
  getExamsByAcademicYearAndStandard,
  getStandards,
  getStudentMarksByExam,
  getStudentPerformanceByExam,
  getStudentsByClassSection,
};
