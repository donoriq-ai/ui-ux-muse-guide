import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./SettingsSection";
import * as api from '@/lib/api/client';
import { qk } from "@/lib/api/queries";
import type { Tenant } from "@/lib/api/types";

export function OrganizationCard({ tenant, readOnly }: { tenant: Tenant; readOnly: boolean }) {
  const [name, setName] = useState(tenant.name);
  const qc = useQueryClient();
  const dirty = name.trim() !== tenant.name && name.trim().length > 0;

  const m = useMutation({
    mutationFn: () => api.saveSettings({ name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.tenant });
      qc.invalidateQueries({ queryKey: qk.audit() });
      toast.success("Organization updated");
    },
    onError: () => toast.error("Failed to update organization"),
  });

  return (
    <SettingsSection
      title="Organization"
      description="How this tenant appears across the workspace and on reports."
      dirty={dirty}
      saving={m.isPending}
      onSave={() => m.mutate()}
      onReset={() => setName(tenant.name)}
      readOnly={readOnly}
    >
      <div className="max-w-md space-y-2">
        <Label htmlFor="org-name" className="text-xs">
          Tenant name
        </Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-sm"
          disabled={readOnly}
        />
      </div>
    </SettingsSection>
  );
}
