import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "af-btn focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "",
        outline: "af-btn--secondary",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
