import { GraduationCap } from "lucide-react";
import { Field } from "../components/Field";
import { StepIntro } from "../components/StepIntro";
import type { AdmissionWorkflow } from "../hooks/useAdmissionWorkflow";

export function AdmissionStep({
  workflow,
  onChange,
}: {
  workflow: AdmissionWorkflow;
  onChange: (field: "admissionDate" | "admissionStatus" | "remarks", value: string) => void;
}) {
  return (
    <StepIntro
      icon={<GraduationCap size={19} />}
      title="Admission record"
      copy="Enter the final admission details. Academic and student values come from earlier steps."
    >
      <div className="admission-form-grid">
        <Field label="Admission Date" required>
          <input type="date" value={workflow.admissionDate} onChange={(event) => onChange("admissionDate", event.target.value)} />
        </Field>
        <Field label="Admission Status" required>
          <select value={workflow.admissionStatus} onChange={(event) => onChange("admissionStatus", event.target.value)}>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
        <Field label="Remarks">
          <textarea value={workflow.remarks} onChange={(event) => onChange("remarks", event.target.value)} />
        </Field>
      </div>
    </StepIntro>
  );
}
