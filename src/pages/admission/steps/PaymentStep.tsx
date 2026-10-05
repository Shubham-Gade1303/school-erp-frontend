import { FileText } from "lucide-react";
import type { FeePayment, StudentFee } from "../../../types/admission";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { RecordEditor } from "../components/RecordEditor";
import { StepIntro } from "../components/StepIntro";
import { formatAmount, formatDate } from "../utils/format";

const paymentMethods = ["CASH", "UPI", "CARD", "CHEQUE"] as const;

export function PaymentStep({
  fee,
  payments,
  draft,
  saving,
  onDraft,
  onSave,
  onEdit,
}: {
  fee: StudentFee | undefined;
  payments: FeePayment[];
  draft: FeePayment | null;
  saving: boolean;
  onDraft: (draft: FeePayment | null) => void;
  onSave: () => void;
  onEdit: (payment: FeePayment) => void;
}) {
  const totalPaid = payments.reduce((total, payment) => total + Number(payment.amountPaid || 0), 0);
  const balance = Math.max(0, Number(fee?.amount || 0) - totalPaid);
  const amountAlreadyPaid = draft
    ? payments.filter((payment) => !draft.id || payment.id !== draft.id).reduce((total, payment) => total + Number(payment.amountPaid || 0), 0)
    : totalPaid;
  const maxDraftAmount = draft ? Math.max(0, Number(fee?.amount || 0) - amountAlreadyPaid) : balance;
  const exceedsBalance = Boolean(draft && Number(draft.amountPaid) > maxDraftAmount);

  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Payments"
      copy="Record one or more payments against the selected fee."
    >
      {!fee ? (
        <EmptyState text="Select a fee in the Fees step before recording payments." />
      ) : (
        <>
          <div className="payment-balance">
            <div><span>Fee total</span><strong>{formatAmount(fee.amount)}</strong></div>
            <div><span>Total paid</span><strong>{formatAmount(totalPaid)}</strong></div>
            <div><span>Balance due</span><strong>{formatAmount(balance)}</strong></div>
          </div>
          {payments.length ? (
            <div className="admission-table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={payment.id ?? `${payment.paymentDate}-${index}`}>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>{formatAmount(payment.amountPaid)}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{payment.transactionReference || "-"}</td>
                      <td>{payment.receiptNumber || "-"}</td>
                      <td><button className="text-button" disabled={saving} onClick={() => onEdit(payment)} type="button">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No payments recorded for this fee yet." />
          )}
          {draft ? (
            <RecordEditor title={draft.id ? "Edit payment" : "Add payment"}>
              <div className="admission-form-grid">
                <Field label="Payment Date" required>
                  <input type="date" value={draft.paymentDate} onChange={(event) => onDraft({ ...draft, paymentDate: event.target.value })} />
                </Field>
                <Field label="Amount Paid" required>
                  <input
                    aria-describedby="payment-balance-help"
                    max={maxDraftAmount.toFixed(2)}
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={draft.amountPaid || ""}
                    onChange={(event) => onDraft({ ...draft, amountPaid: Number(event.target.value) })}
                  />
                </Field>
                <Field label="Payment Method" required>
                  <select value={draft.paymentMethod} onChange={(event) => onDraft({ ...draft, paymentMethod: event.target.value })}>
                    <option value="">Select payment method</option>
                    {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </Field>
                <Field label="Transaction Reference">
                  <input value={draft.transactionReference ?? ""} onChange={(event) => onDraft({ ...draft, transactionReference: event.target.value })} />
                </Field>
                <Field label="Receipt Number">
                  <input value={draft.receiptNumber ?? ""} onChange={(event) => onDraft({ ...draft, receiptNumber: event.target.value })} />
                </Field>
                <Field label="Remarks">
                  <input value={draft.remarks ?? ""} onChange={(event) => onDraft({ ...draft, remarks: event.target.value })} />
                </Field>
              </div>
              <p className={exceedsBalance ? "field-error" : "field-help"} id="payment-balance-help">
                Remaining balance available for this payment: {formatAmount(maxDraftAmount)}
              </p>
              <div className="editor-actions">
                <button className="secondary-button" disabled={saving || exceedsBalance || maxDraftAmount <= 0} onClick={onSave} type="button">{saving ? "Saving..." : "Save payment"}</button>
                <button className="text-button" disabled={saving} onClick={() => onDraft(null)} type="button">Cancel</button>
              </div>
            </RecordEditor>
          ) : (
            <button
              className="secondary-button"
              disabled={saving || balance <= 0}
              onClick={() => onDraft({
                studentFeeId: fee.id ?? 0,
                paymentDate: new Date().toISOString().slice(0, 10),
                amountPaid: 0,
                paymentMethod: "",
                transactionReference: "",
                receiptNumber: "",
                remarks: "",
              })}
              type="button"
            >
              Add payment
            </button>
          )}
        </>
      )}
    </StepIntro>
  );
}
