'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Card, fmtDateTime, ResetBtn, SearchBtn, TextInput } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

interface NoticeRow {
  id: string;
  title: string;
  noticeType: string;
  noticeLevel: string;
  publisher: string;
  publishedAt: string;
}

export function NoticesScreen() {
  const [rows, setRows] = useState<NoticeRow[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(
    (q = search) =>
      api<{ notices: NoticeRow[] }>(`/api/agent/notices?search=${encodeURIComponent(q)}`).then(
        (d) => setRows(d.notices)
      ),
    [search]
  );
  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Notice Title</span>
        <TextInput
          className="w-full sm:w-64"
          placeholder="Keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SearchBtn onClick={() => void load()} />
        <ResetBtn
          onClick={() => {
            setSearch('');
            void load('');
          }}
        />
      </Card>

      <Card>
        <DataTable
          data={rows}
          rowKey={(n) => n.id}
          manualPagination={false}
          columns={[
            {
              header: 'Index',
              cell: (_, idx) => <span className="text-slate-400">{idx + 1}</span>,
            },
            {
              header: 'Notice Title',
              accessorKey: 'title',
              cell: (n) => <span className="font-medium text-slate-700">{n.title}</span>,
            },
            {
              header: 'Notice Type',
              accessorKey: 'noticeType',
            },
            {
              header: 'Notice Level',
              accessorKey: 'noticeLevel',
            },
            {
              header: 'Publish Time',
              accessorKey: 'publishedAt',
              cell: (n) => fmtDateTime(n.publishedAt),
            },
            {
              header: 'Publisher',
              accessorKey: 'publisher',
            },
            {
              header: 'Action',
              enableSorting: false,
              cell: () => <button className="text-blue-500 hover:underline">View</button>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
