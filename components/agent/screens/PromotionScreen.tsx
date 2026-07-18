'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Drawer,
  Field,
  fmtMoney,
  ResetBtn,
  SearchBtn,
  Select,
  Table,
  TextInput,
  Toggle,
} from '../ui';

interface PromoRow {
  id: string;
  type: string;
  assignUsername: string | null;
  bonusPercent: string;
  minDeposit: string;
  maxBonus: string;
  redemptionMultiplier: string;
  activeDays: number[];
  hiddenFromPlayers: boolean;
  onlineOnly: boolean;
  status: string;
  remark: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  promotion_game: 'Promotion Game (100% Bonus)',
  double_game: 'Double Game Bonus',
  loyalty_drop: 'Loyalty Drop',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PromotionScreen() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'promotion_game',
    bonusPercent: '100',
    minDeposit: '20.00',
    maxBonus: '100.00',
    redemptionMultiplier: '2',
    activeDays: [] as number[],
    timezone: 'America/New_York',
    hiddenFromPlayers: false,
    onlineOnly: false,
    status: 'enabled',
    remark: '',
  });

  const load = () => api<{ promotions: PromoRow[] }>('/api/agent/promotions').then((d) => setRows(d.promotions));
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setErr(null);
    try {
      await api('/api/agent/promotions', { method: 'POST', body: JSON.stringify(form) });
      setAddOpen(false);
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const toggleStatus = async (r: PromoRow) => {
    await api('/api/agent/promotions', {
      method: 'PUT',
      body: JSON.stringify({ id: r.id, status: r.status === 'enabled' ? 'disabled' : 'enabled' }),
    });
    void load();
  };

  const remove = async (r: PromoRow) => {
    await api(`/api/agent/promotions?id=${r.id}`, { method: 'DELETE' });
    void load();
  };

  const filtered = rows.filter(
    (r) =>
      (filterType === 'all' || r.type === filterType) &&
      (filterStatus === 'all' || r.status === filterStatus)
  );

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      activeDays: f.activeDays.includes(d)
        ? f.activeDays.filter((x) => x !== d)
        : [...f.activeDays, d],
    }));

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Promotion Type</span>
        <Select
          className="w-full sm:w-52"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Select Type</option>
          {Object.entries(TYPE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <span className="text-sm text-slate-500">Status</span>
        <Select
          className="w-full sm:w-36"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Select Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </Select>
        <SearchBtn onClick={() => void load()} />
        <ResetBtn
          onClick={() => {
            setFilterType('all');
            setFilterStatus('all');
            void load();
          }}
        />
      </Card>

      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={() => {
            setErr(null);
            setAddOpen(true);
          }}
        >
          <Plus size={16} /> Add Promotion
        </Btn>
        <Table
          headers={['#', 'User', 'Promotion Type', 'Threshold', 'Reward', 'Condition', 'Status', 'Operations']}
          empty={filtered.length === 0}
        >
          {filtered.map((r, i) => (
            <tr key={r.id}>
              <td className="px-4 py-3">{i + 1}</td>
              <td className="px-4 py-3">{r.assignUsername ?? 'Store Account'}</td>
              <td className="px-4 py-3">{TYPE_LABEL[r.type] ?? r.type}</td>
              <td className="px-4 py-3">{fmtMoney(r.minDeposit)}</td>
              <td className="px-4 py-3">
                {Number(r.bonusPercent)}% (max {fmtMoney(r.maxBonus)})
              </td>
              <td className="px-4 py-3">{Number(r.redemptionMultiplier)}x playthrough</td>
              <td className="px-4 py-3">
                <span
                  className={
                    r.status === 'enabled'
                      ? 'rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600'
                      : 'rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                  }
                >
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-3 whitespace-nowrap text-sm">
                  <button className="text-blue-500 hover:underline" onClick={() => void toggleStatus(r)}>
                    {r.status === 'enabled' ? 'Disable' : 'Enable'}
                  </button>
                  <button className="text-red-500 hover:underline" onClick={() => void remove(r)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Drawer
        title="Add Promotion Config"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={create}>Confirm</Btn>
          </>
        }
      >
        <div className="space-y-5">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
          <Field label="Promotion Type" required>
            <div className="space-y-2">
              {Object.entries(TYPE_LABEL).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    checked={form.type === k}
                    onChange={() => setForm({ ...form, type: k })}
                  />
                  {l}
                </label>
              ))}
              <p className="text-xs text-slate-400">
                The first game after the first deposit of the day.
              </p>
            </div>
          </Field>
          <Field
            label="Bonus Percentage"
            hint="Pick a preset or type a custom percentage (1–200). Bonus = min(deposit × bonusPercent%, Max Bonus Amount)."
          >
            <TextInput
              type="number"
              value={form.bonusPercent}
              onChange={(e) => setForm({ ...form, bonusPercent: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Min Deposit (Threshold)" hint="Minimum deposit to qualify">
              <TextInput
                type="number"
                value={form.minDeposit}
                onChange={(e) => setForm({ ...form, minDeposit: e.target.value })}
              />
            </Field>
            <Field label="Max Bonus Amount" required hint="Maximum bonus that can be given">
              <TextInput
                type="number"
                value={form.maxBonus}
                onChange={(e) => setForm({ ...form, maxBonus: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Redemption Multiplier" hint="Redemption condition = Bonus amount × multiplier">
            <Select
              value={form.redemptionMultiplier}
              onChange={(e) => setForm({ ...form, redemptionMultiplier: e.target.value })}
            >
              <option value="1">1x</option>
              <option value="2">2x (Default)</option>
              <option value="3">3x</option>
            </Select>
          </Field>
          <Field label="Active Days" hint="Leave empty for every day">
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.activeDays.includes(i)}
                    onChange={() => toggleDay(i)}
                  />
                  {d}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Timezone" hint="Used to determine active days and daily reset time">
            <Select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
            </Select>
          </Field>
          <Field
            label="Hidden from Players"
            hint="When enabled, this promotion is active but not visible in the player's promotion list."
          >
            <Toggle
              checked={form.hiddenFromPlayers}
              onChange={(v) => setForm({ ...form, hiddenFromPlayers: v })}
            />
          </Field>
          <Field
            label="Online Only"
            hint="When enabled, this promotion only applies to online balance transfers."
          >
            <Toggle checked={form.onlineOnly} onChange={(v) => setForm({ ...form, onlineOnly: v })} />
          </Field>
          <Field label="Status">
            <div className="flex gap-5 text-sm text-slate-600">
              {(['enabled', 'disabled'] as const).map((st) => (
                <label key={st} className="flex items-center gap-2 capitalize">
                  <input
                    type="radio"
                    checked={form.status === st}
                    onChange={() => setForm({ ...form, status: st })}
                  />
                  {st}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Remark">
            <TextInput
              placeholder="Optional remark"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
