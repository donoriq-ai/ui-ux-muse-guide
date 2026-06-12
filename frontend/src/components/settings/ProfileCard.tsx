import { SectionCard } from "@/components/SectionCard";
import type { User } from "@/lib/api/types";

const ROLE_LABEL: Record<User["role"], string> = {
  admin: "Administrator",
  user: "User",
};

export function ProfileCard({ user }: { user: User }) {
  return (
    <SectionCard title="Your profile" description="Identity from your active session.">
      <div className="p-4 grid sm:grid-cols-3 gap-4">
        <Field label="Name" value={user.name} />
        <Field label="Email" value={<span className="font-mono text-[12px]">{user.email}</span>} />
        <Field
          label="Role"
          value={
            <span className="inline-flex items-center gap-1.5 rounded border border-primary/20 bg-primary-soft px-2 h-6 text-[11px] text-primary font-medium">
              {ROLE_LABEL[user.role]}
            </span>
          }
        />
      </div>
    </SectionCard>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-[13px]">{value}</div>
    </div>
  );
}
