import type { ReactNode } from "react";

export function StepIntro({
  icon,
  title,
  copy,
  children,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <div className="admission-content">
      <div className="admission-title">
        <span>{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
