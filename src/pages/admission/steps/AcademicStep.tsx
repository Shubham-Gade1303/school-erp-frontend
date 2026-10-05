import { GraduationCap } from "lucide-react";
import type { AcademicYear, ClassSection, Standard } from "../../../types/admission";
import { Field } from "../components/Field";
import { StepIntro } from "../components/StepIntro";
import type { AdmissionWorkflow } from "../hooks/useAdmissionWorkflow";

export function AcademicStep({
  academicYears,
  standards,
  sections,
  workflow,
  sectionsLoading,
  onAcademicYearChange,
  onStandardChange,
  onSectionChange,
}: {
  academicYears: AcademicYear[];
  standards: Standard[];
  sections: ClassSection[];
  workflow: AdmissionWorkflow;
  sectionsLoading: boolean;
  onAcademicYearChange: (value: string) => void;
  onStandardChange: (value: string) => void;
  onSectionChange: (value: string) => void;
}) {
  return (
    <StepIntro
      icon={<GraduationCap size={19} />}
      title="Academic context"
      copy="Choose the academic year, standard, and division for this admission."
    >
      <div className="admission-form-grid">
        <Field label="Academic Year" required>
          <select value={workflow.academicYearId} onChange={(event) => onAcademicYearChange(event.target.value)}>
            <option value="">Select academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.academicYear}{year.active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Standard" required>
          <select value={workflow.standardId} onChange={(event) => onStandardChange(event.target.value)}>
            <option value="">Select standard</option>
            {standards.map((standard) => (
              <option key={standard.id} value={standard.id}>{standard.standardName}</option>
            ))}
          </select>
        </Field>
        <Field label="Division" required>
          <select
            disabled={sectionsLoading || !sections.length}
            value={workflow.classSectionId}
            onChange={(event) => onSectionChange(event.target.value)}
          >
            <option value="">
              {sectionsLoading ? "Loading divisions..." : sections.length ? "Select division" : "Choose year and standard first"}
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>{section.sectionName}</option>
            ))}
          </select>
        </Field>
      </div>
    </StepIntro>
  );
}
