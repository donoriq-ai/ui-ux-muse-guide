import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, id, className, ...rest }, ref) => {
    const inputId = id ?? `f-${label.toLowerCase().replace(/\W+/g, "-")}`;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-[12px] font-medium text-foreground"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors",
            "border-border focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            error && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20",
            className,
          )}
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-err`} className="text-[12px] text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-[12px] text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = "FormField";
