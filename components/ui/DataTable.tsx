'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Btn, Pagination } from '@/components/agent/ui';

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  enableSorting?: boolean;
  enableGlobalFilter?: boolean;
  className?: string;
};

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  // Manual overrides for server-side
  manualPagination?: boolean;
  totalRows?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  globalSearch?: string;
  onSearchChange?: (search: string) => void;
  extraToolbar?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No Data',
  rowKey,
  manualPagination = false,
  totalRows,
  currentPage,
  onPageChange,
  onPageSizeChange,
  globalSearch,
  onSearchChange,
  extraToolbar,
}: DataTableProps<T>) {
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState<number | 'All'>(pageSize);

  const globalFilter = globalSearch !== undefined ? globalSearch : internalGlobalFilter;
  const page = currentPage !== undefined ? currentPage : internalPage;
  const limit = internalLimit; // We can let internalLimit drive page size, or expose it

  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setInternalGlobalFilter(val);
    if (onPageChange) onPageChange(1);
    else setInternalPage(1);
  };

  const handlePageChange = (p: number) => {
    if (onPageChange) onPageChange(p);
    else setInternalPage(p);
  };

  // 1. Filter
  const filteredData = useMemo(() => {
    if (manualPagination) return data; // Server handles filtering
    if (!globalFilter) return data;
    const query = globalFilter.toLowerCase();
    return data.filter((row) => {
      return columns.some((col) => {
        if (col.enableGlobalFilter === false) return false;
        if (col.accessorKey) {
          const val = row[col.accessorKey];
          if (val && String(val).toLowerCase().includes(query)) return true;
        }
        return false;
      });
    });
  }, [data, columns, globalFilter]);

  // 2. Sort
  const sortedData = useMemo(() => {
    if (manualPagination) return filteredData; // Server handles sorting if needed
    if (!sorting) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[sorting.id];
      const bVal = b[sorting.id];
      if (aVal === bVal) return 0;
      const isAsc = !sorting.desc;
      if (aVal == null) return isAsc ? -1 : 1;
      if (bVal == null) return isAsc ? 1 : -1;
      const result = aVal < bVal ? -1 : 1;
      return isAsc ? result : -result;
    });
  }, [filteredData, sorting, manualPagination]);

  // 3. Paginate
  const activeLimit = limit === 'All' ? Math.max(1, manualPagination ? (totalRows ?? data.length) : sortedData.length) : limit;
  const totalItems = manualPagination ? (totalRows ?? data.length) : sortedData.length;
  const pages = Math.max(1, Math.ceil(totalItems / activeLimit));
  const currentPageVal = Math.min(page, pages);
  const paginatedData = manualPagination ? data : sortedData.slice((currentPageVal - 1) * activeLimit, currentPageVal * activeLimit);

  const handleSort = (colId: string) => {
    if (manualPagination) return; // Disable client sort if manual
    setSorting((prev) => {
      if (prev?.id === colId) {
        if (prev.desc) return null; // Reset sort
        return { id: colId, desc: true };
      }
      return { id: colId, desc: false };
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400"
            />
          </div>
          {extraToolbar}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Show</span>
          <select
            value={limit}
            onChange={(e) => {
              const val = e.target.value;
              const numVal = val === 'All' ? 'All' : Number(val);
              setInternalLimit(numVal);
              if (onPageSizeChange && numVal !== 'All') onPageSizeChange(numVal);
              handlePageChange(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="All">All</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-slate-500">
              {columns.map((col, i) => {
                const canSort = col.accessorKey && col.enableSorting !== false;
                const isSorted = sorting?.id === col.accessorKey;
                return (
                  <th
                    key={i}
                    className={cn('whitespace-nowrap px-4 py-3 font-semibold', canSort && 'cursor-pointer select-none hover:bg-slate-100')}
                    onClick={() => canSort && handleSort(col.accessorKey as string)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {canSort && (
                        <div className="flex flex-col text-slate-300">
                          <ChevronUp size={12} className={cn('-mb-1', isSorted && !sorting?.desc && 'text-blue-500')} />
                          <ChevronDown size={12} className={cn(isSorted && sorting?.desc && 'text-blue-500')} />
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-600">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-12 text-slate-300">
                    <PackageOpen size={44} strokeWidth={1.2} />
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/60">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className={cn('px-4 py-2.5', col.className)}>
                      {col.cell ? col.cell(row, rowIndex) : col.accessorKey ? String(row[col.accessorKey] ?? '') : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && limit !== 'All' && (
        <Pagination
          total={totalItems}
          page={currentPageVal}
          pageSize={activeLimit}
          onPage={handlePageChange}
        />
      )}
    </div>
  );
}
