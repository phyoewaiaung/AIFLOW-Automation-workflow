'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, MessageSquare, Gamepad2, Mail, Loader2, CheckCircle2, ToggleLeft } from 'lucide-react';

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  readonly?: boolean;
  defaultValue?: string;
}

interface IntegrationConfigDialogProps {
  open: boolean;
  type: string;
  name: string;
  existingConfig?: Record<string, string>;
  onSave: (config: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

const INTEGRATION_FIELDS: Record<string, {
  fields: FieldDef[];
  help: React.ReactNode;
  useDefaults?: boolean;
}> = {
  SLACK: {
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password' },
      { key: 'defaultChannel', label: 'Default Channel', placeholder: '#general', defaultValue: '#general' },
    ],
    help: (
      <>
        Need a token? Create a Slack app at{' '}
        <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps</a>
        {' — '}add scopes <code className="text-xs bg-muted px-1 rounded">chat:write</code> + <code className="text-xs bg-muted px-1 rounded">conversations:read</code>, install to workspace.
      </>
    ),
  },
  DISCORD: {
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'Discord bot token', type: 'password' },
    ],
    help: (
      <>
        Create an app at{' '}
        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary underline">discord.com/developers/applications</a>
        {' → '}Bot → copy token. Use <strong>OAuth2 → URL Generator</strong> to invite the bot to your server.
      </>
    ),
  },
  GMAIL: {
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com', defaultValue: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'Port', placeholder: '587', defaultValue: '587', readonly: true },
      { key: 'smtpUser', label: 'Email Address', placeholder: 'your@gmail.com' },
      { key: 'smtpPass', label: 'App Password', placeholder: '16-character password', type: 'password' },
      { key: 'smtpFrom', label: 'From Address', placeholder: 'your@gmail.com' },
    ],
    help: (
      <>
        Need an app password? Go to{' '}
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/apppasswords</a>
        {' — '}enable 2FA first, then generate a 16-character password.
      </>
    ),
    useDefaults: true,
  },
};

const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  SLACK: MessageSquare,
  DISCORD: Gamepad2,
  GMAIL: Mail,
};

export function IntegrationConfigDialog({
  open,
  type,
  name,
  existingConfig = {},
  onSave,
  onClose,
}: IntegrationConfigDialogProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [useDefaults, setUseDefaults] = useState(!existingConfig.smtpHost);
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const meta = INTEGRATION_FIELDS[type];
    if (!meta) return { ...existingConfig };
    const defaults: Record<string, string> = {};
    for (const f of meta.fields) {
      if (f.defaultValue && !existingConfig[f.key]) {
        defaults[f.key] = f.defaultValue;
      }
    }
    return { ...defaults, ...existingConfig };
  });

  const meta = INTEGRATION_FIELDS[type];

  if (!open) return null;

  const Icon = INTEGRATION_ICONS[type] || MessageSquare;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (useDefaults && meta?.useDefaults) {
        await onSave({});
      } else {
        await onSave(config);
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const isCustom = !meta?.useDefaults || !useDefaults;
  const requiredField = meta?.fields[0]?.key;
  const canSave = !isCustom || (requiredField ? !!config[requiredField] : true);

  const displayValue = (field: FieldDef) => {
    if (isCustom) return config[field.key] || '';
    return field.defaultValue || field.placeholder || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Configure {name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <div className="flex items-center justify-center gap-2 py-8 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span>Saved successfully</span>
          </div>
        ) : (
          <>
            {meta?.help && (
              <p className="text-sm text-muted-foreground">{meta.help}</p>
            )}

            {meta?.useDefaults && (
              <label className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/50 rounded-lg cursor-pointer select-none">
                <ToggleLeft className={`w-5 h-5 transition-colors ${useDefaults ? 'text-muted-foreground' : 'text-primary'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">Use system defaults</span>
                  <p className="text-[11px] text-muted-foreground">Use the SMTP config from environment variables</p>
                </div>
                <input
                  type="checkbox"
                  checked={useDefaults}
                  onChange={() => setUseDefaults(!useDefaults)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${useDefaults ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useDefaults ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
              </label>
            )}

            <div className="space-y-3">
              {meta?.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={displayValue(field)}
                    readOnly={!isCustom || field.readonly}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                    className={`w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      !isCustom || field.readonly ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !canSave}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
