import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn.js";

const InteractiveHoverButton = React.forwardRef(
  ({
    text = "Button",
    className,
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    iconOnly = false,
    ...props
  }, ref) => {
    const displayContent = children || text;

    // Size variants
    const sizeClasses = {
      xs: "px-3 py-1.5 text-xs gap-1",
      sm: "px-4 py-2 text-sm gap-1.5",
      md: "px-6 py-2.5 text-base gap-2",
      lg: "px-8 py-3 text-lg gap-2.5",
      xl: "px-10 py-4 text-xl gap-3",
      icon: "p-2.5",
    };

    // Variant styles
    const variantClasses = {
      primary: "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
      secondary: "bg-gradient-to-r from-zinc-800 to-zinc-900 text-white border-zinc-700 hover:border-zinc-600 hover:from-zinc-700 hover:to-zinc-800",
      outline: "border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800/50 hover:border-gray-500",
      ghost: "bg-transparent text-gray-300 border-transparent hover:bg-gray-800/50 hover:text-white",
      destructive: "bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent shadow-lg shadow-red-500/25 hover:shadow-red-500/40",
      success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-transparent shadow-lg shadow-green-500/25 hover:shadow-green-500/40",
      orange: "bg-orange-500 hover:bg-orange-600 text-white border-transparent shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50",
      muted: "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200",
    };

    // Width
    const widthClass = fullWidth ? "w-full" : "w-auto min-w-[8rem]";
    const iconWidthClass = iconOnly ? "w-10 h-10 min-w-0" : widthClass;

    // Base classes
    const baseClasses = `
      group relative cursor-pointer overflow-hidden rounded-full border
      font-semibold text-center transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
      ${loading ? "cursor-wait" : "hover:scale-105"}
    `;

    const focusRingColors = {
      primary: "focus:ring-blue-500",
      secondary: "focus:ring-zinc-500",
      outline: "focus:ring-gray-500",
      ghost: "focus:ring-gray-500",
      destructive: "focus:ring-red-500",
      success: "focus:ring-green-500",
      orange: "focus:ring-orange-500",
      muted: "focus:ring-gray-500",
    };

    const combinedClasses = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      iconWidthClass,
      focusRingColors[variant],
      className,
    );

    // Loading spinner
    if (loading) {
      return (
        <button
          ref={ref}
          className={combinedClasses}
          disabled
          {...props}
        >
          <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" />
          <span className="sr-only">Loading...</span>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        className={combinedClasses}
        disabled={disabled}
        {...props}
      >
        {!iconOnly && (
          <>
            <span className="inline-flex items-center gap-1.5 translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
              {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
              <span>{displayContent}</span>
              {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </span>
            <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5">
                {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                <span>{displayContent}</span>
                {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
                {!iconOnly && <ArrowRight className="w-4 h-4 flex-shrink-0" />}
              </span>
            </div>
          </>
        )}
        {iconOnly && (
          <>
            <span className="transition-all duration-300 group-hover:scale-110">
              {displayContent}
            </span>
            <div className="absolute top-0 z-10 flex h-full w-full items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
              {displayContent}
            </div>
          </>
        )}
        <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]">
          {variant === "primary" && <span className="bg-blue-500 group-hover:bg-blue-500" />}
          {variant === "secondary" && <span className="bg-zinc-600 group-hover:bg-zinc-600" />}
          {variant === "outline" && <span className="bg-gray-600 group-hover:bg-gray-600" />}
          {variant === "ghost" && <span className="bg-gray-700 group-hover:bg-gray-700" />}
          {variant === "destructive" && <span className="bg-red-500 group-hover:bg-red-500" />}
          {variant === "success" && <span className="bg-green-500 group-hover:bg-green-500" />}
          {variant === "orange" && <span className="bg-orange-600 group-hover:bg-orange-600" />}
          {variant === "muted" && <span className="bg-gray-600 group-hover:bg-gray-600" />}
        </div>
      </button>
    );
  }
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };