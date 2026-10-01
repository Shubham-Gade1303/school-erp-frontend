import { ArrowLeft, ClipboardList, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TeacherFeaturePlaceholder({ title }: { title: string }) {
  const navigate = useNavigate();

  return (
    <section className="feature-placeholder">
      <button className="back-button" onClick={() => navigate("/teacher/dashboard")} type="button"><ArrowLeft size={15} /> Back to dashboard</button>
      <div className="placeholder-card panel">
        <Construction size={30} />
        <p className="eyebrow">Teacher workspace</p>
        <h1>{title}</h1>
        <p>This area is ready for the Spring Boot API integration. No placeholder records are shown.</p>
        <ClipboardList size={19} />
      </div>
    </section>
  );
}