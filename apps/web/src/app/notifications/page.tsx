'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { useNotificationStore } from '@/store/use-notification-store';
import { useToastStore } from '@/store/use-toast-store';
import { notifications } from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { connectSocket, subscribeToNotifications, unsubscribeFromNotifications } from '@/lib/socket';

const typeConfig: Record<string, { icon: any; color: string }> = {
  INFO:    { icon: Info, color: 'text-blue-500' },
  SUCCESS: { icon: CheckCircle, color: 'text-green-500' },
  WARNING: { icon: AlertTriangle, color: 'text-yellow-500' },
  ERROR:   { icon: XCircle, color: 'text-red-500' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { isLoading, token, checkAuth, user, organization } = useAuthStore();
  const decrementNoti = useNotificationStore((s) => s.decrement);
  const resetNotiCount = useNotificationStore((s) => s.reset);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    resetNotiCount();
  }, [resetNotiCount]);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const data = await notifications.list(organization.id);
      setList(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token && organization?.id) load();
  }, [token, organization?.id, load]);

  useEffect(() => {
    if (!user?.id || !organization?.id) return;
    const socket = connectSocket(user.id);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    subscribeToNotifications(organization.id);

    socket.on('notification:new', (data: any) => {
      setList((prev) => [data, ...prev]);
    });

    return () => {
      unsubscribeFromNotifications(organization.id);
    };
  }, [user?.id, organization?.id]);

  const handleMarkRead = async (id: string) => {
    try {
      await notifications.markRead(id);
      setList((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      decrementNoti();
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    if (!organization?.id) return;
    try {
      await notifications.markAllRead(organization.id);
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
      resetNotiCount();
      addToast('All notifications marked as read', 'success');
    } catch { /* ignore */ }
  };

  const unreadCount = list.filter((n) => !n.read).length;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground mt-1">Stay updated on your workflows</p>
            </div>
            <div className="flex items-center gap-3">
              {connected && <span className="w-2 h-2 rounded-full bg-green-500" title="Real-time connected" />}
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  <CheckCheck className="w-4 h-4 mr-1" />Mark all read ({unreadCount})
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">Notifications will appear here when your workflows run</p>
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((n) => {
                const config = typeConfig[n.type] || typeConfig.INFO;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                      n.read ? 'bg-muted/30' : 'bg-muted/60 border-l-2 border-primary'
                    } ${n.link ? 'cursor-pointer hover:bg-muted' : ''}`}
                    onClick={() => {
                      if (n.link) { handleMarkRead(n.id); router.push(n.link); }
                    }}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'font-medium'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {n.link && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                      {!n.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-7 h-7 p-0"
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
