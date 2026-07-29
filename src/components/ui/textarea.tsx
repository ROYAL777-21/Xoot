import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoGrow?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const bringFieldIntoView = (element: HTMLElement) => {
  if (typeof window === "undefined" || !("visualViewport" in window)) return;

  window.setTimeout(() => {
    element.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, 90);
};

const resizeTextarea = (element: HTMLTextAreaElement) => {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 240)}px`;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = true, onInput, onFocus, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    React.useEffect(() => {
      if (autoGrow && innerRef.current) {
        resizeTextarea(innerRef.current);
      }
    }, [autoGrow, props.value]);

    const handleInput: React.FormEventHandler<HTMLTextAreaElement> = (event) => {
      if (autoGrow) {
        resizeTextarea(event.currentTarget);
      }
      onInput?.(event);
    };

    const handleFocus: React.FocusEventHandler<HTMLTextAreaElement> = (event) => {
      bringFieldIntoView(event.currentTarget);
      onFocus?.(event);
    };

    return (
      <textarea
        className={cn(
          "native-input native-textarea flex min-h-[88px] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={innerRef}
        onInput={handleInput}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
