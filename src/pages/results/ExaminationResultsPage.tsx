import axios from "axios";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  LoaderCircle,
  Printer,
  Search,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAllSchools } from "../../API/schoolApi";
import {
  getAcademicYears,
  getClassSections,
  getExamsByAcademicYearAndStandard,
  getStandards,
  getStudentMarksByExam,
  getStudentsByClassSection,
} from "../../services/resultService";
import type { AcademicYear, ClassSection, Standard } from "../../types/admission";
import type { ExamRecord } from "../../types/exam";
import type { Student } from "../../types/student";
import type { StudentMarksRecord } from "../../types/studentRecords";
import {
  buildSectionResults,
  buildStudentResults,
  getGradeDistribution,
  getSubjectResults,
  type Grade,
  type ResultStatus,
  type SectionResult,
  type StudentResult,
  type SubjectResult,
} from "../../utils/resultCalculations";
import "./ExaminationResultsPage.css";

const PAGE_SIZE = 10;
const gradeOptions: Array<Grade | "ALL"> = ["ALL", "A+", "A", "B+", "B", "C+", "C", "D", "F"];
const statusOptions: Array<ResultStatus | "ALL"> = ["ALL", "PASS", "FAIL", "NOT_APPEARED"];

type ResultData = {
  students: Student[];
  marks: StudentMarksRecord[];
  results: StudentResult[];
  sections: SectionResult[];
  subjectResults: SubjectResult[];
};

const emptyResultData: ResultData = {
  students: [],
  marks: [],
  results: [],
  sections: [],
  subjectResults: [],
};

export function ExaminationResultsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [examId, setExamId] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [resultData, setResultData] = useState<ResultData>(emptyResultData);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [filterRetry, setFilterRetry] = useState(0);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [resultError, setResultError] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResultStatus | "ALL">("ALL");
  const [gradeFilter, setGradeFilter] = useState<Grade | "ALL">("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const requestId = useRef(0);

  const selectedExam = exams.find((exam) => String(exam.id) === examId) ?? null;
  const selectedStandard = standards.find((standard) => String(standard.id) === standardId) ?? null;
  const selectedSection = sections.find((section) => String(section.id) === sectionId) ?? null;
  const sectionLabel = sectionId === "all" ? "All Sections" : selectedSection?.sectionName ?? "—";

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoadingLookups(true);
    setLookupError("");
    Promise.allSettled([getAcademicYears(), getStandards(), getAllSchools()]).then(([yearsResult, standardsResult, schoolsResult]) => {
      if (!active) return;
      const errors: string[] = [];
      if (yearsResult.status === "fulfilled") {
        const years = yearsResult.value.data;
        setAcademicYears(years);
        const activeYear = years.find((year) => year.active) ?? years[0];
        if (activeYear) setAcademicYearId(String(activeYear.id));
      } else errors.push("Unable to load academic years.");
      if (standardsResult.status === "fulfilled") {
        const nextStandards = standardsResult.value.data;
        setStandards(nextStandards);
        if (nextStandards[0]) setStandardId(String(nextStandards[0].id));
      } else errors.push("Unable to load standards.");
      if (schoolsResult.status === "fulfilled") setSchoolName(schoolsResult.value.data[0]?.schoolName ?? "");
      if (errors.length) setLookupError(errors.join(" "));
    }).finally(() => {
      if (active) setIsLoadingLookups(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!academicYearId || !standardId) {
      // oxlint-disable-next-line react/set-state-in-effect
      setExams([]);
      setSections([]);
      setExamId("");
      setSectionId("all");
      return;
    }
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoadingFilters(true);
    // oxlint-disable-next-line react/set-state-in-effect
    setFilterError("");
    setExams([]);
    setSections([]);
    Promise.allSettled([
      getExamsByAcademicYearAndStandard(Number(academicYearId), Number(standardId)),
      getClassSections(Number(academicYearId), Number(standardId)),
    ]).then(([examsResult, sectionsResult]) => {
      if (!active) return;
      const errors: string[] = [];
      if (examsResult.status === "fulfilled") {
        const nextExams = examsResult.value.data.filter((exam) => exam.active);
        setExams(nextExams);
        setExamId((current) => nextExams.some((exam) => String(exam.id) === current) ? current : "");
      } else errors.push("Unable to load examinations for the selected academic year and standard.");
      if (sectionsResult.status === "fulfilled") {
        setSections(sectionsResult.value.data.filter((section) => section.active));
        setSectionId((current) => current === "all" || sectionsResult.value.data.some((section) => String(section.id) === current) ? current : "all");
      } else errors.push("Unable to load class sections.");
      if (errors.length) setFilterError(errors.join(" "));
    }).finally(() => {
      if (active) setIsLoadingFilters(false);
    });
    return () => { active = false; };
  }, [academicYearId, standardId, filterRetry]);

  useEffect(() => {
    if (!examId || !sections.length) {
      // oxlint-disable-next-line react/set-state-in-effect
      setResultData(emptyResultData);
      setResultError("");
      return;
    }
    const currentRequestId = ++requestId.current;
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoadingResults(true);
    // oxlint-disable-next-line react/set-state-in-effect
    setResultError("");
    const requestedSections = sectionId === "all" ? sections : sections.filter((section) => String(section.id) === sectionId);
    Promise.allSettled([
      getStudentMarksByExam(Number(examId)),
      ...requestedSections.map((section) => getStudentsByClassSection(section.id)),
    ]).then((results) => {
      if (!active || currentRequestId !== requestId.current) return;
      const marksResult = results[0];
      if (marksResult.status === "rejected") {
        setResultData(emptyResultData);
        setResultError(getApiError(marksResult.reason, "Unable to load examination marks."));
        return;
      }
      const students: Student[] = [];
      const seenStudents = new Set<number>();
      results.slice(1).forEach((studentResult) => {
        if (studentResult.status !== "fulfilled") return;
        (studentResult.value.data as Student[]).forEach((student) => {
          if (!seenStudents.has(student.id)) {
            seenStudents.add(student.id);
            students.push(student);
          }
        });
      });
      const studentIds = new Set(students.map((student) => student.id));
      const marks = marksResult.value.data.filter((mark) => studentIds.has(mark.studentId));
      const resultsByStudent = buildStudentResults(students, marks);
      setResultData({
        students,
        marks,
        results: resultsByStudent,
        sections: buildSectionResults(requestedSections, students, resultsByStudent),
        subjectResults: getSubjectResults(marks),
      });
      const failedStudentRequests = results.slice(1).filter((studentResult) => studentResult.status === "rejected").length;
      if (failedStudentRequests) setResultError("Some class sections could not be loaded. The visible results may be incomplete.");
    }).finally(() => {
      if (active && currentRequestId === requestId.current) setIsLoadingResults(false);
    });
    return () => { active = false; };
  }, [examId, sectionId, sections]);

  const subjectOptions = useMemo(() => [...new Map(resultData.marks.map((mark) => [mark.subjectId, { id: mark.subjectId, label: mark.subjectName ?? `Subject ${mark.subjectId}` }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [resultData.marks]);
  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resultData.results.filter((result) => {
      const name = getStudentName(result.student).toLowerCase();
      const admission = result.student.admissionNumber.toLowerCase();
      const matchesSearch = !query || name.includes(query) || admission.includes(query);
      const matchesStatus = statusFilter === "ALL" || result.status === statusFilter;
      const matchesGrade = gradeFilter === "ALL" || result.grade === gradeFilter;
      const matchesSubject = subjectFilter === "ALL" || result.marks.some((mark) => String(mark.subjectId) === subjectFilter);
      return matchesSearch && matchesStatus && matchesGrade && matchesSubject;
    });
  }, [gradeFilter, resultData.results, search, statusFilter, subjectFilter]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setPage(1);
  }, [search, statusFilter, gradeFilter, subjectFilter, examId, sectionId]);

  const pageCount = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleResults = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const appearedResults = resultData.results.filter((result) => result.status !== "NOT_APPEARED");
  const passedCount = appearedResults.filter((result) => result.status === "PASS").length;
  const stats = {
    totalStudents: resultData.results.length,
    appeared: appearedResults.length,
    passPercentage: appearedResults.length ? (passedCount / appearedResults.length) * 100 : null,
    classAverage: average(resultData.results.map((result) => result.percentage)),
  };
  const gradeDistribution = getGradeDistribution(resultData.results);
  const failedCount = appearedResults.length - passedCount;
  const notAppearedCount = resultData.results.length - appearedResults.length;

  function retryResults() {
    setResultError("");
    if (selectedExam && sections.length) {
      const targetSections = sectionId === "all" ? sections : sections.filter((section) => String(section.id) === sectionId);
      void reloadResultData(Number(examId), targetSections);
    }
  }

  async function reloadResultData(selectedExamId: number, requestedSections: ClassSection[]) {
    const currentRequestId = ++requestId.current;
    setIsLoadingResults(true);
    try {
      const [marksResponse, ...studentResponses] = await Promise.all([
        getStudentMarksByExam(selectedExamId),
        ...requestedSections.map((section) => getStudentsByClassSection(section.id)),
      ]);
      if (currentRequestId !== requestId.current) return;
      const students = studentResponses.flatMap((response) => response.data).filter((student, index, all) => all.findIndex((item) => item.id === student.id) === index);
      const studentIds = new Set(students.map((student) => student.id));
      const marks = marksResponse.data.filter((mark) => studentIds.has(mark.studentId));
      const results = buildStudentResults(students, marks);
      setResultData({ students, marks, results, sections: buildSectionResults(requestedSections, students, results), subjectResults: getSubjectResults(marks) });
    } catch (error) {
      setResultError(getApiError(error, "Unable to reload examination results."));
    } finally {
      if (currentRequestId === requestId.current) setIsLoadingResults(false);
    }
  }

  return (
    <section className="examination-results-page">
      <header className="examination-results-header">
        <div><p className="examination-results-kicker">Academic insights</p><h1>EXAMINATION RESULTS</h1><p>View, analyze and compare examination performance across classes, sections and students.</p></div>
        <div className="examination-results-actions"><button className="results-secondary-button" disabled={!resultData.results.length} onClick={() => exportResults(filteredResults, selectedExam, selectedStandard, sectionLabel, schoolName)} type="button"><Download size={15} /> Export</button><button className="results-secondary-button" disabled={!resultData.results.length} onClick={() => window.print()} type="button"><Printer size={15} /> Print Class</button></div>
      </header>

      {lookupError && <ErrorBanner message={lookupError} onRetry={() => window.location.reload()} />}
      {filterError && <ErrorBanner message={filterError} onRetry={() => { setFilterError(""); setFilterRetry((current) => current + 1); }} />}
      {resultError && <ErrorBanner message={resultError} onRetry={retryResults} />}

      <section className="results-filter-card panel" aria-label="Examination filters">
        <div className="results-section-heading"><div><p className="results-section-kicker">1. Examination Filters</p><h2>Set the result scope</h2></div><FileText size={20} /></div>
        <div className="results-filter-grid"><FilterSelect disabled={isLoadingLookups} label="Academic Year" value={academicYearId} onChange={(value) => { setAcademicYearId(value); setExamId(""); }} options={academicYears.map((year) => ({ value: String(year.id), label: year.academicYear }))} emptyLabel={isLoadingLookups ? "Loading academic years..." : "Select academic year"} /><FilterSelect disabled={isLoadingLookups} label="Standard" value={standardId} onChange={(value) => { setStandardId(value); setExamId(""); setSectionId("all"); }} options={standards.map((standard) => ({ value: String(standard.id), label: standard.standardName }))} emptyLabel={isLoadingLookups ? "Loading standards..." : "Select standard"} /><FilterSelect disabled={isLoadingFilters || !standardId} label="Examination" value={examId} onChange={(value) => setExamId(value)} options={exams.map((exam) => ({ value: String(exam.id), label: `${exam.examName} · ${exam.academicYear}` }))} emptyLabel={isLoadingFilters ? "Loading examinations..." : "Select examination"} /><FilterSelect disabled={isLoadingFilters || !standardId} label="Section" value={sectionId} onChange={setSectionId} options={sections.map((section) => ({ value: String(section.id), label: section.sectionName }))} emptyLabel={isLoadingFilters ? "Loading sections..." : "All Sections"} includeAll /></div>
      </section>

      <section className="results-overview-section" aria-label="Class performance overview"><div className="results-section-heading"><div><p className="results-section-kicker">2. Class Performance Overview</p><h2>{selectedExam ? `${selectedExam.examName} overview` : "Choose an examination"}</h2></div>{selectedExam && <span className="results-scope-pill">{selectedStandard?.standardName ?? "Standard"} · {sectionLabel}</span>}</div><div className="results-summary-grid"><SummaryCard icon={<UsersRound size={18} />} label="Total Students" value={isLoadingResults ? "…" : resultData.results.length ? String(stats.totalStudents) : "—"} /><SummaryCard icon={<CheckCircle2 size={18} />} label="Appeared Students" value={isLoadingResults ? "…" : resultData.results.length ? String(stats.appeared) : "—"} /><SummaryCard icon={<TrendingUp size={18} />} label="Pass Percentage" value={isLoadingResults ? "…" : stats.passPercentage === null ? "—" : formatPercentage(stats.passPercentage)} /><SummaryCard icon={<BarChart3 size={18} />} label="Class Average" value={isLoadingResults ? "…" : stats.classAverage === null ? "—" : formatPercentage(stats.classAverage)} /></div></section>

      <section className="results-section-card panel" aria-label="Section-wise results"><div className="results-section-heading"><div><p className="results-section-kicker">3. Section-wise Results</p><h2>Compare sections</h2></div></div>{isLoadingResults ? <SectionLoading /> : resultData.sections.length ? <SectionTable sections={resultData.sections} /> : <EmptyState message="Select an examination to compare sections." />}</section>

      <section className="results-section-card panel" aria-label="Student result register"><div className="results-section-heading results-register-heading"><div><p className="results-section-kicker">4. Student Result Register</p><h2>Detailed student results</h2><p>Students without marks remain visible as Not Appeared.</p></div><span className="results-register-total">{filteredResults.length} shown</span></div><div className="results-register-toolbar"><label className="results-search"><Search size={15} /><span className="visually-hidden">Search by student name or admission number</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search student name or admission number..." type="search" value={search} /></label><FilterSelect compact label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as ResultStatus | "ALL")} options={statusOptions.filter((value) => value !== "ALL").map((value) => ({ value, label: formatStatus(value) }))} emptyLabel="All statuses" includeAll /><FilterSelect compact label="Grade" value={gradeFilter} onChange={(value) => setGradeFilter(value as Grade | "ALL")} options={gradeOptions.filter((value) => value !== "ALL").map((value) => ({ value, label: value }))} emptyLabel="All grades" includeAll /><FilterSelect compact label="Subject" value={subjectFilter} onChange={setSubjectFilter} options={subjectOptions.map((subject) => ({ value: String(subject.id), label: subject.label }))} emptyLabel="All subjects" includeAll /></div>{isLoadingResults ? <SectionLoading /> : filteredResults.length ? <><StudentResultTable expandedStudentId={expandedStudentId} results={visibleResults} onExpand={(studentId) => setExpandedStudentId((current) => current === studentId ? null : studentId)} onPrint={printIndividualResult} /><Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} /></> : <EmptyState message={resultData.results.length ? "No students match the current filters." : "No result data is available for this examination and section."} />}</section>

      <section className="results-analytics-section" aria-label="Result analytics"><div className="results-section-heading"><div><p className="results-section-kicker">5. Analytics</p><h2>Performance insights</h2></div></div><div className="results-analytics-grid"><GradeDistribution distribution={gradeDistribution} total={resultData.results.length} /><PassFailAnalytics failed={failedCount} notAppeared={notAppearedCount} passed={passedCount} /><SubjectPerformanceTable results={resultData.subjectResults} /><SectionComparisonChart sections={resultData.sections} /></div></section>
    </section>
  );

  function printIndividualResult(result: StudentResult) {
    const printableSchoolName = schoolName || "SchoolERP";
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>${escapeHtml(getStudentName(result.student))} Result</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#172238}h1{margin:0 0 4px}p{color:#67748a}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:9px;border:1px solid #dfe3eb;text-align:left}th{background:#f4f5f9}.meta{display:flex;gap:24px;margin-top:18px}.meta strong{display:block}</style></head><body><h1>${escapeHtml(printableSchoolName)}</h1><p>${escapeHtml(selectedExam?.examName ?? "Examination Result")} · ${escapeHtml(selectedStandard?.standardName ?? "")} · ${escapeHtml(sectionLabel)}</p><h2>${escapeHtml(getStudentName(result.student))}</h2><p>Admission Number: ${escapeHtml(result.student.admissionNumber)}</p><table><thead><tr><th>Subject</th><th>Subject Code</th><th>Obtained</th><th>Maximum</th><th>Percentage</th><th>Remarks</th></tr></thead><tbody>${result.marks.map((mark) => `<tr><td>${escapeHtml(mark.subjectName ?? "—")}</td><td>${escapeHtml(mark.subjectCode ?? "—")}</td><td>${mark.marksObtained}</td><td>${mark.maximumMarks}</td><td>${formatPercentage(mark.maximumMarks ? (mark.marksObtained / mark.maximumMarks) * 100 : null)}</td><td>${escapeHtml(mark.remarks ?? "—")}</td></tr>`).join("")}</tbody></table><div class="meta"><div><strong>Total</strong>${result.totalObtained}/${result.totalMaximum}</div><div><strong>Percentage</strong>${formatPercentage(result.percentage)}</div><div><strong>Grade</strong>${result.grade ?? "—"}</div><div><strong>Status</strong>${formatStatus(result.status)}</div></div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

function FilterSelect({ label, value, options, emptyLabel, disabled = false, compact = false, includeAll = false, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; emptyLabel: string; disabled?: boolean; compact?: boolean; includeAll?: boolean; onChange: (value: string) => void }) {
  return <label className={`results-filter-field${compact ? " is-compact" : ""}`}><span>{label}</span><span className="results-select-wrap"><select disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}><option value={includeAll ? "all" : ""}>{emptyLabel}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown aria-hidden="true" size={14} /></span></label>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="results-summary-card"><span className="results-summary-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></article>;
}

function SectionTable({ sections }: { sections: SectionResult[] }) {
  return <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Section</th><th>Total Students</th><th>Appeared</th><th>Passed</th><th>Failed</th><th>Pass %</th><th>Average %</th></tr></thead><tbody>{sections.map((section) => <tr key={section.sectionId}><td><strong>{section.sectionName}</strong></td><td>{section.totalStudents}</td><td>{section.appeared}</td><td>{section.passed}</td><td>{section.failed}</td><td>{formatPercentage(section.passPercentage)}</td><td>{formatPercentage(section.averagePercentage)}</td></tr>)}</tbody></table></div>;
}

function StudentResultTable({ results, expandedStudentId, onExpand, onPrint }: { results: StudentResult[]; expandedStudentId: number | null; onExpand: (studentId: number) => void; onPrint: (result: StudentResult) => void }) {
  return <div className="results-table-wrap"><table className="results-table results-register-table"><thead><tr><th>Admission No.</th><th>Student Name</th><th>Subject-wise Marks</th><th>Obtained</th><th>Maximum</th><th>Percentage</th><th>Grade</th><th>Result Status</th><th>Actions</th></tr></thead><tbody>{results.map((result) => <>{<tr key={result.student.id}><td>{result.student.admissionNumber}</td><td><strong>{getStudentName(result.student)}</strong></td><td><div className="subject-summary">{result.marks.length ? result.marks.map((mark) => <span key={mark.id}>{mark.subjectName ?? `Subject ${mark.subjectId}`} <b>{mark.marksObtained}/{mark.maximumMarks}</b></span>) : <span className="not-appeared-text">No marks recorded</span>}</div></td><td>{result.marks.length ? result.totalObtained : "—"}</td><td>{result.marks.length ? result.totalMaximum : "—"}</td><td>{formatPercentage(result.percentage)}</td><td>{result.grade ?? "—"}</td><td><StatusBadge status={result.status} /></td><td><div className="result-row-actions"><button aria-label={`View ${getStudentName(result.student)} details`} onClick={() => onExpand(result.student.id)} type="button">{expandedStudentId === result.student.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Details</button><button aria-label={`Print ${getStudentName(result.student)} result`} onClick={() => onPrint(result)} type="button"><Printer size={14} /></button></div></td></tr>}{expandedStudentId === result.student.id && <tr className="expanded-result-row" key={`${result.student.id}-details`}><td colSpan={9}><StudentSubjectMarks result={result} /></td></tr>}</>)}</tbody></table></div>;
}

function StudentSubjectMarks({ result }: { result: StudentResult }) {
  if (!result.marks.length) return <p className="expanded-empty">No marks recorded for this student in the selected examination.</p>;
  return <div className="subject-details-grid">{result.marks.map((mark) => <div className="subject-detail-card" key={mark.id}><strong>{mark.subjectName ?? `Subject ${mark.subjectId}`}</strong><small>{mark.subjectCode ?? "No code"}</small><span>{mark.marksObtained} / {mark.maximumMarks}</span><small>{formatPercentage(mark.maximumMarks ? (mark.marksObtained / mark.maximumMarks) * 100 : null)} · {mark.remarks || "No remarks"}</small></div>)}</div>;
}

function StatusBadge({ status }: { status: ResultStatus }) {
  return <span className={`result-status-badge ${status.toLowerCase()}`}>{status === "NOT_APPEARED" ? "Not Appeared" : status}</span>;
}

function GradeDistribution({ distribution, total }: { distribution: Record<Grade, number>; total: number }) {
  return <AnalyticsPanel icon={<BarChart3 size={17} />} title="Grade Distribution"><div className="grade-bars">{gradeOptions.filter((grade): grade is Grade => grade !== "ALL").map((grade) => <div className="grade-bar-row" key={grade}><b>{grade}</b><span><i style={{ width: total ? `${(distribution[grade] / total) * 100}%` : "0%" }} /></span><small>{distribution[grade]}</small></div>)}</div></AnalyticsPanel>;
}

function PassFailAnalytics({ passed, failed, notAppeared }: { passed: number; failed: number; notAppeared: number }) {
  const total = passed + failed + notAppeared;
  return <AnalyticsPanel icon={<TrendingUp size={17} />} title="Pass vs Fail"><div className="analytics-stat-list"><AnalyticsStat color="green" label="Passed Students" value={passed} percent={total ? (passed / total) * 100 : 0} /><AnalyticsStat color="red" label="Failed Students" value={failed} percent={total ? (failed / total) * 100 : 0} /><AnalyticsStat color="gray" label="Not Appeared" value={notAppeared} percent={total ? (notAppeared / total) * 100 : 0} /></div></AnalyticsPanel>;
}

function AnalyticsStat({ label, value, percent, color }: { label: string; value: number; percent: number; color: "green" | "red" | "gray" }) {
  return <div className="analytics-stat"><div><span>{label}</span><strong>{value}</strong></div><div className={`analytics-progress ${color}`}><i style={{ width: `${percent}%` }} /></div></div>;
}

function SubjectPerformanceTable({ results }: { results: SubjectResult[] }) {
  return <AnalyticsPanel icon={<FileText size={17} />} title="Subject-wise Performance">{results.length ? <div className="analytics-mini-table-wrap"><table className="analytics-mini-table"><thead><tr><th>Subject</th><th>Students</th><th>Avg Marks</th><th>Max</th><th>Avg %</th></tr></thead><tbody>{results.map((result) => <tr key={result.subjectId}><td>{result.subjectName}</td><td>{result.studentsWithMarks}</td><td>{result.averageMarks.toFixed(1)}</td><td>{result.maximumMarks.toFixed(1)}</td><td>{formatPercentage(result.averagePercentage)}</td></tr>)}</tbody></table></div> : <EmptyState message="No subject marks available." />}</AnalyticsPanel>;
}

function SectionComparisonChart({ sections }: { sections: SectionResult[] }) {
  return <AnalyticsPanel icon={<BarChart3 size={17} />} title="Section Comparison">{sections.length ? <div className="section-bars">{sections.map((section) => <div className="section-bar-row" key={section.sectionId}><span>{section.sectionName}</span><div><i style={{ width: `${section.averagePercentage ?? 0}%` }} /></div><b>{formatPercentage(section.averagePercentage)}</b></div>)}</div> : <EmptyState message="No section comparison available." />}</AnalyticsPanel>;
}

function AnalyticsPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <article className="results-analytics-panel panel"><div className="analytics-panel-heading"><span>{icon}</span><h3>{title}</h3></div>{children}</article>;
}

function Pagination({ currentPage, pageCount, onPageChange }: { currentPage: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return <div className="results-pagination"><span>Page {currentPage} of {pageCount}</span><div><button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} type="button">Previous</button><button disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)} type="button">Next</button></div></div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="results-empty-state"><FileText size={23} /><span>{message}</span></div>;
}

function SectionLoading() {
  return <div className="results-empty-state" role="status"><LoaderCircle className="results-spinner" size={23} /><span>Loading result data...</span></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="results-error-banner" role="alert"><CircleAlert size={16} /><span>{message}</span><button onClick={onRetry} type="button">Retry</button></div>;
}

function getStudentName(student: Student) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function formatPercentage(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}

function formatStatus(value: string) {
  return value === "NOT_APPEARED" ? "Not Appeared" : value.charAt(0) + value.slice(1).toLowerCase();
}

function exportResults(results: StudentResult[], exam: ExamRecord | null, standard: Standard | null, section: string, schoolName: string) {
  const subjects = [...new Map(results.flatMap((result) => result.marks).map((mark) => [mark.subjectId, mark.subjectName ?? `Subject ${mark.subjectId}`])).entries()];
  const rows = [
    [schoolName || "SchoolERP", "Academic Year", exam?.academicYear ?? "", "Examination", exam?.examName ?? "", "Standard", standard?.standardName ?? "", "Section", section],
    ["Admission Number", "Student Name", ...subjects.flatMap(([, name]) => [`${name} Obtained`, `${name} Maximum`]), "Total Obtained", "Total Maximum", "Percentage", "Grade", "Result Status"],
    ...results.map((result) => [result.student.admissionNumber, getStudentName(result.student), ...subjects.flatMap(([subjectId]) => { const mark = result.marks.find((item) => item.subjectId === subjectId); return [mark?.marksObtained ?? "", mark?.maximumMarks ?? ""]; }), result.totalObtained, result.totalMaximum, result.percentage === null ? "" : result.percentage.toFixed(1), result.grade ?? "", formatStatus(result.status)]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(exam?.examName ?? "examination-results").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function getApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const data: unknown = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;
    const message = [object.message, object.error, object.detail].find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    if (message) return message;
  }
  if (error.response?.status === 403) return "You do not have permission to view this result data.";
  if (error.response?.status === 404) return "The requested result data was not found.";
  if (!error.response) return "Unable to reach the server. Please try again.";
  return fallback;
}
