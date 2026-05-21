import { create } from 'zustand';
import { api } from '@/lib/api';

interface NotificationState {
  unread: number;
  load: (orgId: string) => Promise<void>;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unread: 0,
  load: async (orgId: string) => {
    try {
      const data = await api.get<any[]>('/notifications?organizationId=' + orgId);
      set({ unread: data.filter((n: any) => !n.read).length });
    } catch { /* ignore */ }
  },
  increment: () => set((s) => ({ unread: s.unread + 1 })),
  decrement: () => set((s) => ({ unread: Math.max(0, s.unread - 1) })),
  reset: () => set({ unread: 0 }),
}));
