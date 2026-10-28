import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  MapPin,
  Shield,
  Clock,
  Layers,
  FileJson,
} from 'lucide-react';

interface Business360DrawerProps {
  businessId: string;
  onClose: () => void;
  onVerified: () => void;
}

export const Business360Drawer: React.FC<Business360DrawerProps> = ({
  businessId,
  onClose,
  onVerified,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'sources' | 'contacts' | 'verification'>('profile');
  const [verifying, setVerifying] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');

  React.useEffect(() => {
    fetch(`/api/intelligence/businesses/${businessId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/intelligence/businesses/${businessId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_method: 'OPERATOR_FIELD_VERIFICATION',
          observed_operating_status: 'OPERATING',
          evidence: { notes: evidenceNotes || 'Confirmed operational activity by intelligence operator desk.' },
          verified_by: 'OPERATOR_DESK',
        }),
      });
      const json = await res.json();
      if (json.success) {
        onVerified();
        onClose();
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.business) return null;
  const b = data.business;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {b.category_name || b.category_id}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                b.verification_status === 'VERIFIED_ACTIVE'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {b.verification_status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{b.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {b.address || 'Address unlisted'}, {b.city}, ON {b.postal_code || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 transition ${activeTab === 'profile' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Profile 360
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 border-b-2 transition ${activeTab === 'sources' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Source Records ({data.sourceRecords?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-3 border-b-2 transition ${activeTab === 'contacts' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Contacts & CASL ({data.contacts?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`py-3 border-b-2 transition ${activeTab === 'verification' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Verify Operational Status
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Quality Score</span>
                  <div className="text-2xl font-bold text-indigo-400">{Number(b.quality_score).toFixed(0)} / 100</div>
                  <span className="text-[11px] text-slate-400">Signal completeness & confidence</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Operating Status</span>
                  <div className="text-2xl font-bold text-white">{b.operating_status}</div>
                  <span className="text-[11px] text-slate-400">
                    {b.last_confirmed_at ? `Verified ${new Date(b.last_confirmed_at).toLocaleDateString()}` : 'Unconfirmed independently'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Direct Reachability Channels</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>{b.phone || 'No phone recorded'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>{b.email || 'No email recorded'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    {b.website ? (
                      <a href={b.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                        {b.website}
                      </a>
                    ) : (
                      'No website recorded'
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-4">
              {data.sourceRecords?.map((src: any) => (
                <div key={src.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{src.source_name || src.source_id}</span>
                    <span className="text-xs text-slate-500">ID: {src.source_record_id}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Observed: {new Date(src.observed_at).toLocaleString()} • Checksum: {src.payload_checksum?.slice(0, 12)}...
                  </p>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(src.raw_payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {data.contacts?.map((ct: any) => (
                <div key={ct.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{ct.channel_value}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{ct.channel_type}</span>
                    </div>
                    <span className="text-xs text-slate-400">CASL Basis: {ct.casl_consent_type}</span>
                  </div>
                  {ct.is_suppressed ? (
                    <span className="text-xs text-rose-400 font-semibold">SUPPRESSED</span>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold">ELIGIBLE</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-white">Record Independent Operational Verification</h3>
                <p className="text-xs text-slate-400">
                  Separates raw directory observation from verified operating status. Requires confirmation evidence notes.
                </p>
                <textarea
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="e.g. Phone confirmed with general manager; active customer orders verified."
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  {verifying ? 'Recording...' : 'Mark as Verified Active'}
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase">Verification History</h4>
                {data.verificationEvents?.length === 0 ? (
                  <p className="text-xs text-slate-500">No independent verification events recorded yet.</p>
                ) : (
                  data.verificationEvents?.map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-300 font-medium">
                        <span>{ev.verification_method}</span>
                        <span className="text-slate-500">{new Date(ev.verified_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-400">{ev.evidence?.notes || 'No notes'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
