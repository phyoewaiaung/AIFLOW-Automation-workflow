'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, Search, Plus, LogOut, Settings, User, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useNotificationStore } from '@/store/use-notification-store';
import { connectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, logout } = useAuthStore();
  const unread = useNotificationStore((s) => s.unread);
  const load = useNotificationStore((s) => s.load);
  const increment = useNotificationStore((s) => s.increment);
  const decrement = useNotificationStore((s) => s.decrement);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (organization?.id) load(organization.id);
  }, [organization?.id, load]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);
    socket.emit('notification:subscribe', { userId: user.id });
    socket.on('notification:new', () => increment());
    socket.on('notification:read', () => decrement());
    return () => {
      socket.emit('notification:unsubscribe', { userId: user.id });
      socket.off('notification:new');
      socket.off('notification:read');
    };
  }, [user?.id, increment, decrement]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-0 h-14 bg-card/80 backdrop-blur-xl border-b border-border z-30 md:left-64">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md flex-1 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows, executions..."
              className="w-full h-9 pl-10 pr-4 bg-muted/50 border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => router.push('/workflows/new')}
            className="text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden md:inline">New Workflow</span>
          </Button>

          <button 
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 md:pl-4 border-l border-border"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-medium text-sm">
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <span className="hidden md:block text-sm">{user?.name || user?.email}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
                <button
                  onClick={() => { router.push('/settings'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}