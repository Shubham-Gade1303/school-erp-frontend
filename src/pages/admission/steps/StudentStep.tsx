import { UserRound } from "lucide-react";
import type { AcademicYear, ClassSection, Standard } from "../../../types/admission";
import type { StudentResponse } from "../../../types/student";
import { Field } from "../components/Field";
import { StepIntro } from "../components/StepIntro";
import type { StudentFormValues } from "../hooks/useAdmissionWorkflow";

const genders = ["Male", "Female", "Other"] as const;
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function getTodayDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export type StudentField = keyof StudentFormValues;

export function StudentStep({
  values,
  errors,
  savedStudent,
  academicYear,
  standard,
  section,
  onChange,
}: {
  values: StudentFormValues;
  errors: Partial<Record<StudentField, string>>;
  savedStudent: StudentResponse | null;
  academicYear?: AcademicYear;
  standard?: Standard;
  section?: ClassSection;
  onChange: (field: StudentField, value: string) => void;
}) {
  const maxDate = getTodayDate();

  return (
    <StepIntro
      icon={<UserRound size={19} />}
      title="New student details"
      copy="Enter the new student's details."
    >
      <section aria-label="Enrolling in" className="enrolling-summary">
        <div className="enrolling-summary-heading">
          <h3>Enrolling in</h3>
          {savedStudent && <span className="status-badge active">Saved</span>}
        </div>
        <dl className="enrolling-summary-grid">
          <div><dt>Academic Year</dt><dd>{academicYear?.academicYear || "-"}</dd></div>
          <div><dt>Standard</dt><dd>{standard?.standardName || "-"}</dd></div>
          <div><dt>Division</dt><dd>{section?.sectionName || "-"}</dd></div>
        </dl>
      </section>

      <div className="student-form">
        <Field error={errors.firstName} label="First Name" required>
          <input
            autoComplete="given-name"
            maxLength={100}
            value={values.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
          />
        </Field>
        <Field error={errors.middleName} label="Middle Name">
          <input
            autoComplete="additional-name"
            maxLength={100}
            value={values.middleName}
            onChange={(event) => onChange("middleName", event.target.value)}
          />
        </Field>
        <Field error={errors.lastName} label="Last Name" required>
          <input
            autoComplete="family-name"
            maxLength={100}
            value={values.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
          />
        </Field>
        <Field error={errors.dateOfBirth} label="Date of Birth" required>
          <input
            max={maxDate}
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => onChange("dateOfBirth", event.target.value)}
          />
        </Field>
        <Field error={errors.gender} label="Gender" required>
          <select value={values.gender} onChange={(event) => onChange("gender", event.target.value)}>
            <option value="">Select gender</option>
            {genders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
          </select>
        </Field>
        <Field error={errors.bloodGroup} label="Blood Group">
          <select value={values.bloodGroup} onChange={(event) => onChange("bloodGroup", event.target.value)}>
            <option value="">Select blood group</option>
            {bloodGroups.map((bloodGroup) => <option key={bloodGroup} value={bloodGroup}>{bloodGroup}</option>)}
          </select>
        </Field>
        <Field label="Admission Number">
          <input
            aria-readonly="true"
            className="admission-number-readonly"
            readOnly
            value={savedStudent?.admissionNumber ?? "Auto-generated on save"}
          />
        </Field>
        {savedStudent && (
          <div aria-live="polite" className="student-saved-message">
            Student saved as {savedStudent.admissionNumber}.
          </div>
        )}
      </div>
    </StepIntro>
  );
}
