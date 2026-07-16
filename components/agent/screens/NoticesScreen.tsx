'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Card, fmtDateTime, ResetBtn, SearchBtn, Table, TextInput } from '../ui';

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
        <Table
          headers={['Index', 'Notice Title', 'Notice Type', 'Notice Level', 'Publish Time', 'Publisher', 'Action']}
          empty={rows.length === 0}
        >
          {rows.map((n, i) => (
            <tr key={n.id}>
              <td className="px-4 py-3">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{n.title}</td>
              <td className="px-4 py-3">{n.noticeType}</td>
              <td className="px-4 py-3">{n.noticeLevel}</td>
              <td className="px-4 py-3">{fmtDateTime(n.publishedAt)}</td>
              <td className="px-4 py-3">{n.publisher}</td>
              <td className="px-4 py-3">
                <button className="text-blue-500 hover:underline">View</button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
