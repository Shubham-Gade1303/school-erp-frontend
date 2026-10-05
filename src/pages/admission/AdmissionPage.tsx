import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  GraduationCap,
  LoaderCircle,
} from "lucide-react";
import type { AddressRecord } from "../../types/admission";
import { AcademicStep } from "./steps/AcademicStep";
import { AddressStep } from "./steps/AddressStep";
import { AdmissionStep } from "./steps/AdmissionStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { FeesStep } from "./steps/FeesStep";
import { PaymentStep } from "./steps/PaymentStep";
import { ReviewStep } from "./steps/ReviewStep";
import { StudentStep } from "./steps/StudentStep";
import { useAdmissionWorkflow } from "./hooks/useAdmissionWorkflow";
import { formatAmount } from "./utils/format";
import "./AdmissionPage.css";

const steps = ["Academic", "Student", "Address", "Documents", "Fees", "Payment", "Admission", "Review"];

export function AdmissionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const admission = useAdmissionWorkflow();
  const {
    workflow,
    setWorkflow,
    academicYears,
    standards,
    sections,
    selectedStudent,
    studentForm,
    studentFieldErrors,
    fees,
    payments,
    documentsDraft,
    setDocumentsDraft,
    feeDraft,
    setFeeDraft,
    paymentDraft,
    setPaymentDraft,
    loading,
    sectionsLoading,
    saving,
    error,
    setError,
    success,
    changeAcademicYear,
    changeStandard,
    selectSection,
    updateStudentField,
    saveStudent,
    selectFee,
    saveAddress,
    saveDocument,
    removeDocument,
    saveFee,
    savePayment,
    submitAdmission,
    admitAnotherStudent,
  } = admission;

  const currentYear = academicYears.find((year) => String(year.id) === workflow.academicYearId);
  const currentStandard = standards.find((standard) => String(standard.id) === workflow.standardId);
  const currentSection = sections.find((section) => String(section.id) === workflow.classSectionId);
  const selectedFee = fees.find((fee) => String(fee.id) === workflow.studentFeeId);
  const totalFees = fees.reduce((total, fee) => total + Number(fee.amount || 0), 0);

  function goBack() {
    setError("");
    setConfirmed(false);
    setStep((current) => Math.max(0, current - 1));
  }

  async function goNext() {
    setError("");
    if (step === 0 && (!workflow.academicYearId || !workflow.standardId || !workflow.classSectionId)) {
      setError("Select an academic year, standard, and division before continuing.");
      return;
    }
    if (step === 1) {
      const saved = await saveStudent();
      if (!saved) {
        return;
      }
    }
    if (step === 2) {
      const address = workflow.address;
      if (!address || !isAddressComplete(address)) {
        setError("Complete all address fields before continuing.");
        return;
      }
      if (!address.id) {
        setError("Save the completed address before continuing.");
        return;
      }
    }
    if (step === 3 && documentsDraft) {
      setError("Save or cancel the document editor before continuing.");
      return;
    }
    if (step === 4) {
      if (feeDraft) {
        setError("Save or cancel the fee editor before continuing.");
        return;
      }
      if (!fees.length) {
        setError("Add at least one fee before continuing.");
        return;
      }
    }
    if (step === 5 && paymentDraft) {
      setError("Save or cancel the payment editor before continuing.");
      return;
    }
    if (step === 6 && (!workflow.admissionDate || !workflow.admissionStatus)) {
      setError("Admission date and status are required.");
      return;
    }
    setConfirmed(false);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit() {
    if (!confirmed) {
      setError("Confirm that all details are correct before submitting.");
      return;
    }
    await submitAdmission();
  }

  if (success) {
    return (
      <main className="admission-page">
        <section aria-labelledby="admission-success-title" className="admission-success panel">
          <span className="admission-success-icon"><Check size={28} /></span>
          <p className="admission-eyebrow">Admission complete</p>
          <h1 id="admission-success-title">Student admitted successfully</h1>
          <p>The admission number / ID is <strong>{success.identifier}</strong>.</p>
          <div className="admission-success-actions">
            <button className="primary-button" onClick={() => { admitAnotherStudent(); setStep(0); setConfirmed(false); }} type="button">
              Admit Another Student
            </button>
            <button className="secondary-button" onClick={() => navigate("/admin/dashboard")} type="button">
              Go to Dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admission-page">
      <header className="admission-heading">
        <div>
          <p className="admission-eyebrow">Enrollment workflow</p>
          <h1>Admission</h1>
          <p>Create an admission for a new student.</p>
        </div>
        <div className="admission-heading-actions">
          <span className="admission-count"><GraduationCap size={17} /> 8-step process</span>
          <button className="secondary-button" onClick={() => navigate("/admin/academic-years")} type="button">
            Manage Academic Years
          </button>
        </div>
      </header>
      {error && <p className="admission-message" role="alert"><CircleAlert size={16} /> {error}</p>}
      <nav aria-label="Admission steps" className="admission-stepper">
        {steps.map((label, index) => (
          <button
            aria-current={index === step ? "step" : undefined}
            className={index === step ? "admission-step active" : index < step ? "admission-step complete" : "admission-step"}
            disabled={index > step || saving}
            key={label}
            onClick={() => { setError(""); setConfirmed(false); setStep(index); }}
            type="button"
          >
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            <b>{label}</b>
          </button>
        ))}
      </nav>
      <section className="admission-panel panel">
        {loading && <div className="admission-loading"><LoaderCircle size={16} /> Loading...</div>}
        {step === 0 && (
          <AcademicStep
            academicYears={academicYears}
            standards={standards}
            sections={sections}
            workflow={workflow}
            sectionsLoading={sectionsLoading}
            onAcademicYearChange={changeAcademicYear}
            onStandardChange={changeStandard}
            onSectionChange={(value) => void selectSection(value)}
          />
        )}
        {step === 1 && (
          <StudentStep
            values={studentForm}
            errors={studentFieldErrors}
            savedStudent={selectedStudent}
            academicYear={currentYear}
            standard={currentStandard}
            section={currentSection}
            onChange={updateStudentField}
          />
        )}
        {step === 2 && (
          <AddressStep
            address={workflow.address}
            saving={saving}
            onChange={(address: AddressRecord) => setWorkflow((current) => ({ ...current, address }))}
            onSave={() => void saveAddress()}
          />
        )}
        {step === 3 && (
          <DocumentsStep
            studentId={Number(workflow.studentId)}
            documents={workflow.documents}
            draft={documentsDraft}
            saving={saving}
            onDraft={setDocumentsDraft}
            onSave={() => void saveDocument()}
            onRemove={(document) => void removeDocument(document)}
          />
        )}
        {step === 4 && (
          <FeesStep
            studentId={Number(workflow.studentId)}
            academicYearId={Number(workflow.academicYearId)}
            fees={fees}
            draft={feeDraft}
            selectedFeeId={workflow.studentFeeId}
            saving={saving}
            onDraft={setFeeDraft}
            onSave={() => void saveFee()}
            onEdit={setFeeDraft}
            onSelectFee={selectFee}
          />
        )}
        {step === 5 && (
          <PaymentStep
            fee={selectedFee}
            payments={payments}
            draft={paymentDraft}
            saving={saving}
            onDraft={setPaymentDraft}
            onSave={() => void savePayment()}
            onEdit={setPaymentDraft}
          />
        )}
        {step === 6 && (
          <AdmissionStep
            workflow={workflow}
            onChange={(field, value) => setWorkflow((current) => ({ ...current, [field]: value }))}
          />
        )}
        {step === 7 && (
          <ReviewStep
            workflow={workflow}
            student={selectedStudent}
            academicYear={currentYear}
            standard={currentStandard}
            section={currentSection}
            fees={fees}
            documents={workflow.documents}
            payments={payments}
            confirmed={confirmed}
            onConfirm={setConfirmed}
          />
        )}
      </section>
      {step === 4 && fees.length > 0 && (
        <p className="admission-total">Total fees: <strong>{formatAmount(totalFees)}</strong></p>
      )}
      <footer className="admission-actions">
        <button className="secondary-button" disabled={step === 0 || saving || loading} onClick={goBack} type="button">
          <ArrowLeft size={16} /> Back
        </button>
        {step === steps.length - 1 ? (
          <button className="primary-button" disabled={saving || !confirmed} onClick={() => void submit()} type="button">
            {saving ? "Submitting..." : "Submit Admission"} <Check size={16} />
          </button>
        ) : (
          <button className="primary-button" disabled={saving || loading} onClick={() => void goNext()} type="button">
            Next <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}

function isAddressComplete(address: AddressRecord) {
  return [address.addressLine, address.city, address.state, address.postalCode, address.country]
    .every((value) => value.trim().length > 0);
}
