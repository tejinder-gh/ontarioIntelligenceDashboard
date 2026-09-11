import React, { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, LogOut, Loader2 } from 'lucide-react';

interface Dossier {
  id: string;
  report_id: string;
  city_id: string;
  category_id: string;
  stripe_session_id: string;
  created_at: string;
}

interface UserPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onSignOut: () => void;
}

export const UserPortalModal: React.FC<UserPortalModalProps> = ({ isOpen, onClose, authToken, onSignOut }) => {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !authToken) return;

    setIsLoading(true);
    fetch('/api/user/dossiers', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setDossiers(json.dossiers || []);
        } else {
          setError(json.error || 'Failed to fetch dossiers');
          if (json.error === 'Invalid or expired session' || json.error === 'Authentication required') {
            onSignOut();
          }
        }
      })
      .catch(err => {
        console.error('Fetch dossiers error:', err);
        setError('Network error. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, authToken, onSignOut]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">My Purchased Dossiers</h2>
              <p className="text-xs text-slate-400">View and download your premium commercial intelligence reports</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading your dossier vault...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium text-center">
              {error}
            </div>
          ) : dossiers.length === 0 ? (
            <div className="text-center py-12 space-y-3 border border-dashed border-slate-700 rounded-2xl">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No dossiers found</h3>
              <p className="text-sm text-slate-400">
                You haven't purchased any feasibility dossiers yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossiers.map(dossier => (
                <div key={dossier.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        {dossier.report_id}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(dossier.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {dossier.category_id.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 capitalize">
                      {dossier.city_id.replace('CSD_', '').replace(/-/g, ' ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // We don't have a dedicated printable route in this MVP UI,
                      // so we'll just alert that this would open the PDF.
                      alert(`In a production environment, this would open the secured PDF for report ${dossier.report_id}.`);
                    }}
                    className="mt-4 w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View Secured Report</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
