'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

type Tx = {
  id: string;
  username: string;
  type: string;
  amount: string;
  methodLabel: string;
  status: string;
  createdAt: string;
};

export default function MemberOrdersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ transactions: Tx[]; total: number }>({
    queryKey: ['admin-member-orders', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (search) q.set('search', search);
      const res = await fetch(`/api/admin/member-orders?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' }) => {
      const res = await fetch('/api/admin/member-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-member-orders'] });
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Member Orders</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-100 p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search username or ID..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Username</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading...
                    </Td>
                  </Tr>
                ) : data?.transactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="py-8 text-center text-slate-500">
                      No member orders found.
                    </Td>
                  </Tr>
                ) : (
                  data?.transactions.map((tx) => (
                    <Tr key={tx.id}>
                      <Td className="font-mono text-xs">{tx.id}</Td>
                      <Td>{tx.username}</Td>
                      <Td>
                        <Badge tone={tx.type === 'deposit' ? 'success' : 'warning'}>
                          {tx.type}
                        </Badge>
                      </Td>
                      <Td className="font-mono">${Number(tx.amount).toFixed(2)}</Td>
                      <Td>{tx.methodLabel}</Td>
                      <Td>
                        <Badge tone={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'danger' : 'neutral'}>
                          {tx.status}
                        </Badge>
                      </Td>
                      <Td>{new Date(tx.createdAt).toLocaleString()}</Td>
                      <Td className="text-right">
                        {tx.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={mutation.isPending}
                              onClick={() => mutation.mutate({ id: tx.id, action: 'accept' })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-danger border-danger-100 hover:bg-danger-50"
                              disabled={mutation.isPending}
                              onClick={() => {
                                if (confirm('Are you sure you want to reject this transaction?')) {
                                  mutation.mutate({ id: tx.id, action: 'reject' });
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>

          {data && data.total > pageSize && (
            <div className="border-t border-slate-100 p-4">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
