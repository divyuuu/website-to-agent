export type WorkflowStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "rejected";

const ALLOWED: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ["proposed"],
  proposed: ["approved", "rejected"],
  rejected: ["proposed"],
  approved: [],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}
