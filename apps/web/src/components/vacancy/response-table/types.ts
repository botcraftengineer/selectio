export type SortField =
  | "score"
  | "detailedScore"
  | "status"
  | "createdAt"
  | null;
export type SortDirection = "asc" | "desc";

export const STATUS_ORDER = {
  NEW: 1,
  EVALUATED: 2,
  DIALOG_APPROVED: 3,
  INTERVIEW_HH: 4,
  INTERVIEW_WHATSAPP: 5,
  COMPLETED: 6,
  SKIPPED: 7,
} as const;
