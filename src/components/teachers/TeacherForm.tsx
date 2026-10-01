import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TeacherRequest, TeacherResponse } from "../../types/teacher";

const teacherFields = {
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(50, "Username cannot exceed 50 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string(),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),
  employeeCode: z
    .string()
    .trim()
    .max(20, "Employee code cannot exceed 20 characters"),
  phoneNumber: z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters"),
  active: z.boolean(),
};

const createTeacherSchema = z.object({
  ...teacherFields,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editTeacherSchema = z.object({
  ...teacherFields,
  password: z.string().refine(
    (value) => value.length === 0 || value.length >= 6,
    "Password must be at least 6 characters",
  ),
});

type TeacherFormValues = z.infer<typeof createTeacherSchema>;
const requiredLabels = ["Username", "Email", "Password", "Full Name"] as const;

type TeacherFormProps = {
  teacher: TeacherResponse | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (request: TeacherRequest) => Promise<void>;
};

export function TeacherForm({
  teacher,
  isSaving,
  onCancel,
  onSubmit,
}: TeacherFormProps) {
  const {
    register,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacher === null ? createTeacherSchema : editTeacherSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: getDefaultValues(teacher),
  });

  useEffect(() => {
    reset(getDefaultValues(teacher));
  }, [teacher, reset]);

  const schema = teacher === null ? createTeacherSchema : editTeacherSchema;

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();

    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse({
      username: formData.get("username") ?? "",
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
      fullName: formData.get("fullName") ?? "",
      employeeCode: formData.get("employeeCode") ?? "",
      phoneNumber: formData.get("phoneNumber") ?? "",
      active: formData.get("active") === "on",
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof TeacherFormValues, { message: issue.message });
        }
      }
      return;
    }

    await onSubmit({
      ...result.data,
      username: result.data.username.trim(),
      email: result.data.email.trim(),
      fullName: result.data.fullName.trim(),
      employeeCode: result.data.employeeCode.trim(),
      phoneNumber: result.data.phoneNumber.trim(),
    });
    reset(getDefaultValues(null));
  }

  return (
    <form
      className="teacher-form"
      onSubmit={submitForm}
    >
      <div className="teacher-form-grid">
        <TeacherField label="Username" error={errors.username?.message}>
          <input {...register("username")} autoComplete="username" maxLength={50} />
        </TeacherField>
        <TeacherField label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" />
        </TeacherField>
        <TeacherField label="Password" error={errors.password?.message}>
          <input {...register("password")} autoComplete="new-password" minLength={teacher ? undefined : 6} type="password" />
        </TeacherField>
        <TeacherField label="Full Name" error={errors.fullName?.message}>
          <input {...register("fullName")} maxLength={100} />
        </TeacherField>
        <TeacherField
          label="Employee Code"
          error={errors.employeeCode?.message}
        >
          <input {...register("employeeCode")} maxLength={20} />
        </TeacherField>
        <TeacherField label="Phone Number" error={errors.phoneNumber?.message}>
          <input {...register("phoneNumber")} maxLength={20} />
        </TeacherField>
      </div>
      <label className="teacher-active-field">
        <input {...register("active")} type="checkbox" />
        Active
      </label>
      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : teacher ? "Save Changes" : "Create Teacher"}
        </button>
      </div>
    </form>
  );
}

function TeacherField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="teacher-field">
      <span>
        {label}
        {requiredLabels.includes(label as (typeof requiredLabels)[number]) ? " *" : ""}
      </span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function getDefaultValues(teacher: TeacherResponse | null): TeacherFormValues {
  return {
    username: teacher?.username ?? "",
    email: teacher?.email ?? "",
    password: "",
    fullName: teacher?.fullName ?? "",
    employeeCode: teacher?.employeeCode ?? "",
    phoneNumber: teacher?.phoneNumber ?? "",
    active: teacher?.active ?? true,
  };
}
