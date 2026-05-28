import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportShell({
  donorId,
  children,
}: {
  donorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto" style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: "210mm" }}>
      {/* Toolbar — hidden in print */}
      <div className="no-print flex items-center justify-between mb-4">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 px-2 text-xs">
          <Link to="/donors/$id" params={{ id: donorId }}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to workspace
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
        </Button>
      </div>

      <article className="report-root bg-card border border-border rounded-md">
        <div className="p-8 sm:p-10 space-y-8">{children}</div>
      </article>
    </div>
  );
}
