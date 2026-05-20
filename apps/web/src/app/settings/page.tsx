'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useToastStore } from '@/store/use-toast-store';
import { users, organizations, apiKeys } from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { User, Building, Key, Trash2, Copy, Plus, Loader2, Check } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { user, organization, isLoading, token, checkAuth, setUser, setOrganization } = useAuthStore();
  const [userName, setUserName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [userError, setUserError] = useState('');
  const [orgError, setOrgError] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!organization?.id) return;
    setKeysLoading(true);
    try {
      const data = await apiKeys.list(organization.id);
      setKeys(data);
    } catch { /* ignore */ } finally {
      setKeysLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  useEffect(() => {
    if (user?.name) setUserName(user.name);
    if (organization?.name) setOrgName(organization.name);
  }, [user, organization]);

  useEffect(() => {
    if (token && organization?.id) loadKeys();
  }, [token, organization?.id, loadKeys]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSavingUser(true);
    setUserError('');
    try {
      await users.update(user.id, { name: userName });
      setUser({ name: userName });
      addToast('Profile updated', 'success');
    } catch (err: any) {
      setUserError(err.message || 'Failed to update profile');
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!organization?.id) return;
    setSavingOrg(true);
    setOrgError('');
    try {
      await organizations.update(organization.id, { name: orgName });
      setOrganization({ ...organization, name: orgName });
      addToast('Organization updated', 'success');
    } catch (err: any) {
      setOrgError(err.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const key = await apiKeys.create({ name: newKeyName });
      setNewKeyValue(key.key);
      setKeys((prev) => [key, ...prev]);
      setShowNewKey(false);
      setNewKeyName('');
    } catch (err: any) {
      addToast(err.message || 'Failed to create key', 'error');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await apiKeys.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      addToast('API key deleted', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete key', 'error');
    }
    setDeleteTarget(null);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    addToast('Copied to clipboard', 'success');
  };

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pt-14 md:pl-64">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and organization settings</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input value={userName} onChange={(e) => setUserName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <Input defaultValue={user?.email || ''} className="mt-1" disabled />
                </div>
              </div>
              {userError && <p className="text-sm text-destructive">{userError}</p>}
              <Button onClick={handleSaveProfile} disabled={savingUser}>
                {savingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" />Organization</CardTitle>
              <CardDescription>Organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Organization Name</label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1" />
              </div>
              {orgError && <p className="text-sm text-destructive">{orgError}</p>}
              <Button onClick={handleSaveOrg} disabled={savingOrg}>
                {savingOrg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" />API Keys</CardTitle>
              <CardDescription>Manage API keys for external access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newKeyValue && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm font-medium text-emerald-400 mb-1">Key created — copy it now, it won&apos;t be shown again</p>
                  <div className="flex gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{newKeyValue}</code>
                    <Button size="sm" variant="outline" onClick={() => handleCopyKey(newKeyValue)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {keysLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No API keys yet</p>
                ) : (
                  keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{k.key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleCopyKey(k.key)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(k.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {showNewKey ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Key name (e.g. Production)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateKey()}
                  />
                  <Button size="sm" onClick={handleGenerateKey}><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewKey(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowNewKey(true)}>
                  <Plus className="w-4 h-4 mr-2" />Generate New Key
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete API Key"
        message="This will permanently revoke this API key. Any services using it will lose access."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDeleteKey(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}