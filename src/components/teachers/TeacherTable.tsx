import { Eye, Pencil, Trash2 } from "lucide-react";
import type { TeacherResponse } from "../../types/teacher";

type TeacherTableProps = {
  teachers: TeacherResponse[];
  canManage: boolean;
  onView: (teacher: TeacherResponse) => void;
  onEdit: (teacher: TeacherResponse) => void;
  onDelete: (teacher: TeacherResponse) => void;
};

export function TeacherTable({ teachers, canManage, onView, onEdit, onDelete }: TeacherTableProps) {
  return (
    <div className="teacher-table-wrap">
      <table className="teacher-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Teacher</th>
            <th>Username</th>
            <th>Email</th>
            <th>Employee Code</th>
            <th>Phone Number</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => (
            <tr key={teacher.id}>
              <td>{teacher.id}</td>
              <td><strong>{teacher.fullName}</strong></td>
              <td>{teacher.username}</td>
              <td>{teacher.email}</td>
              <td>{teacher.employeeCode || "-"}</td>
              <td>{teacher.phoneNumber || "-"}</td>
              <td><span className={teacher.active ? "status-badge active" : "status-badge inactive"}>{teacher.active ? "Active" : "Inactive"}</span></td>
              <td>
                <div className="table-actions">
                  <button aria-label={`View ${teacher.fullName}`} onClick={() => onView(teacher)} title="View" type="button"><Eye size={15} /></button>
                  {canManage && <button aria-label={`Edit ${teacher.fullName}`} onClick={() => onEdit(teacher)} title="Edit" type="button"><Pencil size={15} /></button>}
                  {canManage && <button aria-label={`Delete ${teacher.fullName}`} className="danger-action" onClick={() => onDelete(teacher)} title="Delete" type="button"><Trash2 size={15} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
