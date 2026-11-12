"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type StudentForm = {
  name: string;
  student_id: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  section: string;
};

export const emptyForm: StudentForm = { name: "", student_id: "", email: "", phone: "", department: "", year: "1", section: "" };

const PRESET_DEPTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Business", "Design"];

export function StudentFields({
  value,
  onChange,
  lockId = false,
}: {
  value: StudentForm;
  onChange: (v: StudentForm) => void;
  lockId?: boolean;
}) {
  const [depts, setDepts] = useState<string[]>(PRESET_DEPTS);
  useEffect(() => {
    api.departments().then((d) => setDepts(Array.from(new Set([...d, ...PRESET_DEPTS])))).catch(() => {});
  }, []);
  const set = (k: keyof StudentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <div className="form-grid">
      <div className="field full">
        <label>Full name <span className="req">*</span></label>
        <input className="input" value={value.name} onChange={set("name")} placeholder="e.g. Aanya Sharma" required />
      </div>
      <div className="field">
        <label>Student ID <span className="req">*</span></label>
        <input
          className="input mono"
          value={value.student_id}
          onChange={set("student_id")}
          placeholder="CS-2025-014"
          disabled={lockId}
          style={{ textTransform: "uppercase" }}
          required
        />
      </div>
      <div className="field">
        <label>Department</label>
        <input className="input" list="dept-list" value={value.department} onChange={set("department")} placeholder="Computer Science" />
        <datalist id="dept-list">
          {depts.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>
      <div className="field">
        <label>Year</label>
        <select className="input" value={value.year} onChange={set("year")}>
          {["1", "2", "3", "4", "5"].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Section</label>
        <input className="input" value={value.section} onChange={set("section")} placeholder="A" maxLength={4} style={{ textTransform: "uppercase" }} />
      </div>
      <div className="field">
        <label>Email</label>
        <input className="input" type="email" value={value.email} onChange={set("email")} placeholder="name@college.edu" />
      </div>
      <div className="field">
        <label>Phone</label>
        <input className="input" value={value.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
      </div>
    </div>
  );
}
