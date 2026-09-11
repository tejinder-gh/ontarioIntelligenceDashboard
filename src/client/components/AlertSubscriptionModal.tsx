import React, { useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface AlertSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertSubscriptionModal: React.FC<AlertSubscriptionModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="liquid-glass-modal w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-700/60 bg-amber-950/80 p-2 text-amber-400 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="alert-modal-title" className="text-lg font-bold tracking-tight text-white">Intelligence Alerts</h3>
              <p className="text-xs text-slate-300">Availability notice</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 p-6 text-sm text-slate-300">
          <p className="font-semibold text-white">Alert subscriptions are not available yet.</p>
          <p>
            A consented delivery service, verified identity, unsubscribe handling, and retention policy must be specified before subscriptions can open.
          </p>
        </div>

        <div className="flex justify-end border-t border-white/10 bg-slate-900/80 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
