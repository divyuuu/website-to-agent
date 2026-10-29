export interface TestResult {
  subject: string;
  score: number;
  testDate: string;
}

export interface Student {
  id: string;
  name: string;
  results: TestResult[];
}

export const STUDENTS: Student[] = [
  {
    id: "STU-001",
    name: "Aarav Sharma",
    results: [
      { subject: "Math", score: 92, testDate: "2026-10-01" },
      { subject: "Science", score: 88, testDate: "2026-10-03" },
    ],
  },
  {
    id: "STU-002",
    name: "Diya Patel",
    results: [
      { subject: "Math", score: 76, testDate: "2026-10-01" },
      { subject: "English", score: 84, testDate: "2026-10-04" },
    ],
  },
  {
    id: "STU-003",
    name: "Kabir Singh",
    results: [{ subject: "Science", score: 91, testDate: "2026-10-03" }],
  },
  {
    id: "STU-004",
    name: "Meera Iyer",
    results: [
      { subject: "Math", score: 68, testDate: "2026-10-01" },
      { subject: "History", score: 79, testDate: "2026-10-05" },
    ],
  },
];

export function searchStudents(query: string): Student[] {
  const q = query.trim().toLowerCase();
  if (!q) return STUDENTS;
  return STUDENTS.filter(
    (s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );
}
