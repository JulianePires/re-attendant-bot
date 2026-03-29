import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex items-center", className)} {...props} />
  )
);
InputGroup.displayName = "InputGroup";

interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "inline-start" | "inline-end";
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "inline-start", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute inset-y-0 flex items-center justify-center text-zinc-500",
        align === "inline-start" ? "left-3" : "right-3",
        className
      )}
      {...props}
    />
  )
);
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      className={cn(
        "border-zinc-800 bg-zinc-950/50 text-zinc-100 transition-all placeholder:text-zinc-600 focus-visible:border-violet-500 focus-visible:ring-violet-500 dark:placeholder:text-zinc-300",
        // Add padding assuming icon is at start - could be conditionally adjusted but for simplicity, we provide a generic style that works with the requested example
        "pl-10",
        className
      )}
      {...props}
    />
  )
);
InputGroupInput.displayName = "InputGroupInput";

export { InputGroup, InputGroupAddon, InputGroupInput };
