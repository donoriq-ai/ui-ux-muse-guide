export type ActionCategory =
  | "auth"
  | "donor"
  | "document"
  | "field"
  | "evaluation"
  | "settings"
  | "user"
  | "system";

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  auth: "Auth",
  donor: "Donor",
  document: "Document",
  field: "Field",
  evaluation: "Evaluation",
  settings: "Settings",
  user: "User",
  system: "System",
};

// Tailwind classes per category — use design tokens, no raw colors.
export const CATEGORY_CLASSES: Record<ActionCategory, string> = {
  auth: "bg-accent text-accent-foreground border-accent-foreground/15",
  donor: "bg-primary-soft text-primary border-primary/20",
  document: "bg-surface-muted text-foreground/80 border-border",
  field: "bg-indeterminate-soft text-indeterminate-foreground border-indeterminate/30",
  evaluation: "bg-accept-soft text-accept border-accept/30",
  settings: "bg-reject-soft text-reject border-reject/30",
  user: "bg-primary-soft text-primary border-primary/20",
  system: "bg-muted text-muted-foreground border-border",
};

export function categoryOf(action: string): ActionCategory {
  const prefix = action.split(".")[0] as ActionCategory;
  return prefix in CATEGORY_LABELS ? prefix : "system";
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ActionCategory[];
