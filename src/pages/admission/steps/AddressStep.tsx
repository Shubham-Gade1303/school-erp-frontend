import { FileText } from "lucide-react";
import type { AddressRecord } from "../../../types/admission";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { StepIntro } from "../components/StepIntro";

const addressFields = ["addressLine", "city", "state", "postalCode", "country"] as const;
const fieldLabels: Record<(typeof addressFields)[number], string> = {
  addressLine: "Address Line",
  city: "City",
  state: "State",
  postalCode: "Postal Code",
  country: "Country",
};

export function AddressStep({
  address,
  onChange,
  onSave,
  saving,
}: {
  address: AddressRecord | null;
  onChange: (address: AddressRecord) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Student address"
      copy="Review or complete the address belonging to the selected student."
    >
      {address ? (
        <>
          <div className="admission-form-grid">
            {addressFields.map((field) => (
              <Field key={field} label={fieldLabels[field]} required>
                <input
                  value={address[field]}
                  onChange={(event) => onChange({ ...address, [field]: event.target.value })}
                />
              </Field>
            ))}
          </div>
          <button className="secondary-button" disabled={saving} onClick={onSave} type="button">
            {saving ? "Saving..." : "Save address"}
          </button>
        </>
      ) : (
        <EmptyState text="Select a student first to load address information." />
      )}
    </StepIntro>
  );
}
