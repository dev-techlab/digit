'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api, Btn, Card, Field, Select, TextInput, Toggle } from '../ui';

interface CsConfig {
  enabled: boolean;
  contactPhoneEnabled: boolean;
  contactPhone: string | null;
  platform: string;
  jsUrl: string | null;
}

export function CsConfigScreen() {
  const [config, setConfig] = useState<CsConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ config: CsConfig }>('/api/agent/cs-config').then((d) => setConfig(d.config));
  }, []);

  if (!config) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  const save = async () => {
    await api('/api/agent/cs-config', { method: 'PUT', body: JSON.stringify(config) });
    setMsg('Configuration saved');
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <Card className="max-w-4xl">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <h3 className="text-lg font-semibold text-slate-800">Default Configuration</h3>
        {config.enabled && (
          <span className="rounded bg-green-50 px-2 py-0.5 text-sm font-medium text-green-600">
            Enabled
          </span>
        )}
      </div>
      {msg && (
        <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600">
          {msg}
        </p>
      )}
      <p className="mt-5 flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
        <Info size={16} className="mt-0.5 shrink-0" />
        The platform already provides 24-hour online service. If you wish to serve your customers
        yourself, please set up your messaging entry point.
      </p>
      <div className="mt-6 max-w-2xl space-y-5">
        <Field label="Enable">
          <Toggle checked={config.enabled} onChange={(v) => setConfig({ ...config, enabled: v })} />
        </Field>
        <Field
          label="Contact Phone"
          hint="Show a clickable phone number in the player customer-service entry."
        >
          <div className="flex items-center gap-3">
            <Toggle
              checked={config.contactPhoneEnabled}
              onChange={(v) => setConfig({ ...config, contactPhoneEnabled: v })}
            />
            {config.contactPhoneEnabled && (
              <TextInput
                className="w-56"
                placeholder="+1 ..."
                value={config.contactPhone ?? ''}
                onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
              />
            )}
          </div>
        </Field>
        <Field label="Platform" required>
          <Select
            value={config.platform}
            onChange={(e) => setConfig({ ...config, platform: e.target.value })}
          >
            <option>Custom JS Widget</option>
            <option>SaleSmartly</option>
            <option>Intercom</option>
          </Select>
        </Field>
        <Field label="JS URL">
          <TextInput
            value={config.jsUrl ?? ''}
            onChange={(e) => setConfig({ ...config, jsUrl: e.target.value })}
          />
        </Field>
        <Btn className="w-32 justify-center" onClick={save}>
          Save
        </Btn>
      </div>
    </Card>
  );
}
