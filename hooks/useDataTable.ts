import { useState, useCallback } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Fetch error');
  return r.json();
});

interface DataTableResult<T> {
  rows: T[];
  setRows: (updater: React.SetStateAction<T[]>) => void;
  total: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  load: (p?: number, s?: string, extraParams?: Record<string, string>) => Promise<void>;
  reload: () => Promise<void>;
}

export function useDataTable<T>(
  endpoint: string,
  dataKey: string,
  defaultPageSize: number = 20,
  initialExtraParams: Record<string, string> = {}
): DataTableResult<T> {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [extraParams, setExtraParams] = useState<Record<string, string>>(initialExtraParams);

  const q = new URLSearchParams({
    page: String(page),
    pageSize: String(defaultPageSize),
  });
  if (search) q.append('search', search);
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v) q.append(k, v);
  });

  const url = `${endpoint}?${q.toString()}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    keepPreviousData: true,
  });

  const load = useCallback(
    async (p = page, s = search, extra = extraParams) => {
      let changed = false;
      if (p !== page) { setPage(p); changed = true; }
      if (s !== search) { setSearch(s); changed = true; }
      
      const extraChanged = JSON.stringify(extra) !== JSON.stringify(extraParams);
      if (extraChanged) { setExtraParams(extra); changed = true; }
      
      if (!changed) {
        await mutate(); // Force re-fetch if params didn't change but load was called
      }
    },
    [page, search, extraParams, mutate]
  );

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const setRowsOptimistic = useCallback((updater: React.SetStateAction<T[]>) => {
    mutate((current: any) => {
      if (!current) return current;
      const newRows = typeof updater === 'function' ? (updater as any)(current[dataKey] || []) : updater;
      return { ...current, [dataKey]: newRows };
    }, false);
  }, [mutate, dataKey]);

  return {
    rows: (data?.[dataKey] || []) as T[],
    setRows: setRowsOptimistic,
    total: (data?.total || 0) as number,
    page,
    setPage,
    search,
    setSearch,
    loading: isLoading || (!data && !error),
    load,
    reload,
  };
}
