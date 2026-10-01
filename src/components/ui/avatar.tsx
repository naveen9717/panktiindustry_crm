import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, firstName, lastName, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center rounded-full bg-slate-900 font-medium text-white",
          sizes[size],
          className
        )}
        {...props}
      >
        {getInitials(firstName, lastName)}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
