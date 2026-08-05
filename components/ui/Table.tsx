import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <table className={cn('w-full text-sm text-left text-slate-600', className)} {...props} />
  );
}

interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function Thead({ className, ...props }: TableHeadProps) {
  return <thead className={cn('', className)} {...props} />;
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function Tbody({ className, ...props }: TableBodyProps) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

export function Tr({ className, ...props }: TableRowProps) {
  return <tr className={cn('border-b border-slate-100 hover:bg-slate-50/50', className)} {...props} />;
}

interface ThProps extends HTMLAttributes<HTMLTableCellElement> {
  asChild?: boolean;
}

export function Th({ className, ...props }: ThProps) {
  return (
    <th
      className={cn('px-4 py-3 font-semibold text-slate-500 whitespace-nowrap', className)}
      {...props}
    />
  );
}

interface TdProps extends HTMLAttributes<HTMLTableCellElement> {
  asChild?: boolean;
  colSpan?: number;
}

export function Td({ className, colSpan, ...props }: TdProps) {
  return <td colSpan={colSpan} className={cn('px-4 py-2.5 text-slate-600', className)} {...props} />;
}