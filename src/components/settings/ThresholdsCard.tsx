import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SettingsSection } from "./SettingsSection";
import * as api from "@/lib/api/mockApi";
import { qk } from "@/lib/api/queries";
import type { Tenant } from "@/lib/api/types";

export function ThresholdsCard({ tenant, readOnly }: { tenant: Tenant; readOnly: boolean }) {
  const [conf, setConf] = useState(tenant.confidenceThreshold);
  const [weeks, setWeeks] = useState(tenant.gestationalAgePolicyWeeks);
  const qc = useQueryClient();

  const dirty =
    conf !== tenant.confidenceThreshold || weeks !== tenant.gestationalAgePolicyWeeks;

  const m = useMutation({
    mutationFn: () =>
      api.saveSettings({ confidenceThreshold: conf, gestationalAgePolicyWeeks: weeks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.tenant });
      qc.invalidateQueries({ queryKey: qk.audit() });
      toast.success("Thresholds updated");
    },
    onError: () => toast.error("Failed to update thresholds"),
  });

  return (
    <SettingsSection
      title="Thresholds & policies"
      description="Drive low-confidence flagging and birth-tissue eligibility cutoffs."
      dirty={dirty}
      saving={m.isPending}
      onSave={() => m.mutate()}
      onReset={() => {
        setConf(tenant.confidenceThreshold);
        setWeeks(tenant.gestationalAgePolicyWeeks);
      }}
      readOnly={readOnly}
    >
      <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs">Confidence threshold</Label>
            <span className="text-xs font-mono tabular-nums text-foreground/80">
              {conf.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[conf]}
            onValueChange={([v]) => setConf(Number(v.toFixed(2)))}
            min={0.5}
            max={1}
            step={0.01}
            disabled={readOnly}
          />
          <p className="text-[11px] text-muted-foreground">
            Fields extracted below this confidence are flagged for review.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ga-weeks" className="text-xs">
            BT gestational-age policy (weeks)
          </Label>
          <Input
            id="ga-weeks"
            type="number"
            min={20}
            max={42}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="h-9 text-sm w-28"
            disabled={readOnly}
          />
          <p className="text-[11px] text-muted-foreground">
            Minimum gestational age to accept birth-tissue donations.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
