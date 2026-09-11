import React, { useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface CheckoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
        className="liquid-glass-modal rounded-2xl max-w-md w-full shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <h3 id="success-modal-title" className="text-xl font-bold text-white tracking-tight">
            Purchase Successful
          </h3>
          
          <p className="text-sm text-slate-300">
            Thank you for your purchase. Your Location Feasibility Dossier has been successfully generated and sent to your email.
          </p>
          
          <p className="text-xs text-slate-400 mt-2 mb-6">
            Please check your inbox (and spam folder) for the secure access link.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
