import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Field: Container para input com suporte a label e erro
 * Implementa padrão ARIA com aria-describedby
 */
const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
);
Field.displayName = "Field";

/**
 * FieldLabel: Label associado ao campo,  com htmlFor padrão
 */
const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("text-muted-foreground text-sm font-medium", className)}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

/**
 * FieldError: Mensagem de erro associada ao campo via aria-describedby
 * Use o id para referenciar no Input via aria-describedby={errorId}
 */
const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { id?: string }
>(({ className, id, ...props }, ref) => (
  <p
    ref={ref}
    id={id}
    role="alert"
    className={cn("text-sm font-medium text-red-500", className)}
    {...props}
  />
));
FieldError.displayName = "FieldError";

export { Field, FieldLabel, FieldError };
