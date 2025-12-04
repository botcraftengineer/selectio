export type SortField =
  | "score"
  | "detailedScore"
  | "status"
  | "createdAt"
  | "respondedAt"
  | null;
export type SortDirection = "asc" | "desc";

export const STATUS_ORDER = {
  NEW: 1,
  EVALUATED: 2,
  DIALOG_APPROVED: 3,
  INTERVIEW_HH: 4,
  COMPLETED: 5,
  SKIPPED: 6,
} as const;
