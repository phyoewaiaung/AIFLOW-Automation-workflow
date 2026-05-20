'use client';

import { useToastStore } from '@/store/use-toast-store';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  error: 'border-red-500/50 bg-red-500/10 text-red-500',
  success: 'border-green-500/50 bg-green-500/10 text-green-500',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-500',
  warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border backdrop-blur-xl shadow-lg ${colorMap[toast.type]}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
