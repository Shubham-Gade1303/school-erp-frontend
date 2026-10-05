import { Check } from "lucide-react";
import type {
  AcademicYear,
  AddressRecord,
  ClassSection,
  DocumentRecord,
  FeePayment,
  Standard,
  StudentFee,
} from "../../../types/admission";
import type { StudentResponse } from "../../../types/student";
import { ReviewSection } from "../components/ReviewSection";
import { StepIntro } from "../components/StepIntro";
import type { AdmissionWorkflow } from "../hooks/useAdmissionWorkflow";
import { formatAmount, formatDate, getStudentName } from "../utils/format";

export function ReviewStep({
  workflow,
  student,
  academicYear,
  standard,
  section,
  fees,
  documents,
  payments,
  confirmed,
  onConfirm,
}: {
  workflow: AdmissionWorkflow;
  student: StudentResponse | null;
  academicYear?: AcademicYear;
  standard?: Standard;
  section?: ClassSection;
  fees: StudentFee[];
  documents: DocumentRecord[];
  payments: FeePayment[];
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
}) {
  const selectedFee = fees.find((item) => String(item.id) === workflow.studentFeeId);
  const totalFees = fees.reduce((total, fee) => total + Number(fee.amount || 0), 0);
  const address: AddressRecord | null = workflow.address;

  return (
    <StepIntro
      icon={<Check size={19} />}
      title="Review admission"
      copy="Confirm the complete details before submitting this admission."
    >
      <ReviewSection title="Academic" items={[
        ["Academic Year", academicYear?.academicYear || "-"],
        ["Standard", standard?.standardName || "-"],
        ["Division", section?.sectionName || "-"],
      ]} />
      <ReviewSection title="Student" items={[
        ["Admission Number", student?.admissionNumber || "-"],
        ["Student Name", student ? getStudentName(student) : "-"],
        ["Date of Birth", formatDate(student?.dateOfBirth)],
        ["Gender", student?.gender || "-"],
        ["Blood Group", student?.bloodGroup || "-"],
      ]} />
      <ReviewSection title="Address" items={address ? [
        ["Address Line", address.addressLine],
        ["City", address.city],
        ["State", address.state],
        ["Postal Code", address.postalCode],
        ["Country", address.country],
      ] : [["Address", "-"]]} />
      <ReviewSection title="Documents" items={documents.length
        ? documents.map((document) => [document.documentType, document.documentName])
        : [["Documents", "None added"]]} />
      <ReviewSection title="Fees" items={[
        ...fees.map((fee) => [fee.feeType, `${formatAmount(fee.amount)} · ${fee.status}`]),
        ["Total fees", formatAmount(totalFees)],
      ]} />
      <ReviewSection title="Payments" items={selectedFee
        ? [
            ...payments.map((payment) => [
              `${formatDate(payment.paymentDate)} · ${payment.paymentMethod}`,
              formatAmount(payment.amountPaid),
            ]),
            ["Balance due", formatAmount(Math.max(0, Number(selectedFee.amount) - payments.reduce((total, payment) => total + Number(payment.amountPaid || 0), 0)))],
          ]
        : [["Payments", "No fee selected"]]} />
      <ReviewSection title="Admission" items={[
        ["Admission Date", formatDate(workflow.admissionDate)],
        ["Admission Status", workflow.admissionStatus],
        ["Remarks", workflow.remarks || "-"],
      ]} />
      <label className="confirmation-control">
        <input checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} type="checkbox" />
        <span>I confirm all details are correct</span>
      </label>
    </StepIntro>
  );
}
