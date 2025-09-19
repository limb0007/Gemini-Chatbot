// components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          // ⬇️ bigger by default: taller, larger font, comfy padding, resizable
          "flex w-full min-h-24 md:min-h-28 resize-y rounded-xl border border-input bg-background px-4 py-3",
          "text-base md:text-lg leading-relaxed ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
