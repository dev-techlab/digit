import { useState, useCallback } from 'react';

interface DataTableResult<T> {
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
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
  defaultPageSize: number = 20
): DataTableResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Keep track of the latest extra parameters for reload()
  const [currentExtraParams, setCurrentExtraParams] = useState<Record<string, string>>({});

  const load = useCallback(
    async (p = page, s = search, extraParams = currentExtraParams) => {
      setLoading(true);
      setCurrentExtraParams(extraParams);
      try {
        const q = new URLSearchParams({
          page: String(p),
          pageSize: String(defaultPageSize),
        });
        if (s) q.append('search', s);

        Object.entries(extraParams).forEach(([k, v]) => {
          if (v) q.append(k, v);
        });

        const res = await fetch(`${endpoint}?${q.toString()}`);
        if (!res.ok) throw new Error('Fetch error');

        const data = await res.json();
        setRows(data[dataKey] || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(`Failed to load ${endpoint}`, err);
      } finally {
        setLoading(false);
      }
    },
    [endpoint, dataKey, defaultPageSize]
  );

  const reload = useCallback(
    () => load(page, search, currentExtraParams),
    [load, page, search, currentExtraParams]
  );

  return {
    rows,
    setRows,
    total,
    page,
    setPage,
    search,
    setSearch,
    loading,
    load,
    reload,
  };
}
