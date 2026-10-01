import { X } from "lucide-react";
import type { TeacherResponse } from "../../types/teacher";

export function TeacherDetails({ teacher, onClose }: { teacher: TeacherResponse; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-labelledby="teacher-details-title" className="dialog-card" role="dialog">
        <div className="dialog-heading">
          <div><p className="eyebrow">Teacher details</p><h2 id="teacher-details-title">{teacher.fullName}</h2></div>
          <button aria-label="Close details" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <dl className="teacher-details-grid">
          <Detail label="Full Name" value={teacher.fullName} />
          <Detail label="Username" value={teacher.username} />
          <Detail label="Email" value={teacher.email} />
          <Detail label="Employee Code" value={teacher.employeeCode || "-"} />
          <Detail label="Phone Number" value={teacher.phoneNumber || "-"} />
          <Detail label="Status" value={teacher.active ? "Active" : "Inactive"} />
          <Detail label="Teacher ID" value={String(teacher.id)} />
          <Detail label="User ID" value={String(teacher.userId)} />
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
