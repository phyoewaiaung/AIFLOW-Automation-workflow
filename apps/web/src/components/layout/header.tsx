'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, Search, Plus, LogOut, Settings, User, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

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