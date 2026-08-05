import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-violet-600/20 text-violet-300 border-violet-600/30',
        secondary: 'border-transparent bg-slate-700 text-slate-300',
        destructive: 'border-transparent bg-red-500/20 text-red-300 border-red-500/30',
        outline: 'text-slate-300 border-white/10',
        success: 'border-transparent bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'border-transparent bg-amber-500/20 text-amber-300 border-amber-500/30',
        processing: 'border-transparent bg-blue-500/20 text-blue-300 border-blue-500/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
