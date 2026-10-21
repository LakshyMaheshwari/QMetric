import * as React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface InteractiveHoverButtonProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'orange' | 'muted';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
  [key: string]: unknown;
}

declare const InteractiveHoverButton: React.ForwardRefExoticComponent<
  InteractiveHoverButtonProps & React.RefAttributes<HTMLButtonElement>
>;

export { InteractiveHoverButton };