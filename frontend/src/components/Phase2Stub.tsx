import { Button } from "@/components/ui/button";
import { Construction, ArrowRight } from "lucide-react";

interface Props {
  title: string;
  description: string;
  backTo: string;
  backLabel: string;
  backParams?: Record<string, string>;
  fullscreen?: boolean;
}

export function Phase2Stub({ title, description, backTo, backLabel, backParams, fullscreen }: Props) {
  const wrapper = fullscreen
    ? "min-h-screen grid place-items-center p-6"
    : "max-w-2xl mx-auto p-6 sm:p-12";

  let href = backTo;
  if (backParams) {
    for (const [k, v] of Object.entries(backParams)) {
      href = href.replace(`$${k}`, v);
    }
  }

  return (
    <div className={wrapper}>
      <div className="rounded-xl border border-border bg-card shadow-card p-8 sm:p-10 w-full text-center">
        <div className="size-12 rounded-full bg-primary-soft text-primary grid place-items-center mx-auto">
          <Construction className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        <div className="mt-6">
          <Button asChild>
            <a href={href}>
              {backLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
