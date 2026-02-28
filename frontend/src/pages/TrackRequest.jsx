import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TrackRequest() {
  const [type, setType] = useState('request'); // request | grievance
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    if (!number.trim()) { toast.error('Enter tracking number'); return; }
    setLoading(true);
    try {
      const endpoint = type === 'request' ? `/services/track/${number.trim()}` : `/grievances/track/${number.trim()}`;
      const res = await api.get(endpoint);
      setResult({ ...res.data, type });
    } catch (e) { toast.error('Not found. Check your tracking number.'); setResult(null); }
    setLoading(false);
  };

  const STATUS_COLORS = { pending: 'text-yellow-600 bg-yellow-50', processing: 'text-blue-600 bg-blue-50', approved: 'text-green-600 bg-green-50', rejected: 'text-red-600 bg-red-50', completed: 'text-purple-600 bg-purple-50', open: 'text-red-600 bg-red-50', resolved: 'text-green-600 bg-green-50', escalated: 'text-orange-600 bg-orange-50' };

  const STEP_MAP = {
    request: ['pending', 'processing', 'approved', 'completed'],
    grievance: ['open', 'in_progress', 'escalated', 'resolved']
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-2xl font-bold text-gray-800">Track Your Application</h1>
        <p className="text-gray-500 text-sm mt-2">Enter your Request or Grievance number to check status</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setType('request')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'request' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700'}`}>📋 Service Request</button>
          <button onClick={() => setType('grievance')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'grievance' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700'}`}>📢 Grievance</button>
        </div>

        <div className="flex gap-2">
          <input value={number} onChange={e => setNumber(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder={type === 'request' ? 'REQ-20240101-XXXXXX' : 'GRV-20240101-XXXXX'} />
          <button onClick={track} disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50">
            {loading ? '...' : 'Track'}
          </button>
        </div>

        {result && (
          <div className="mt-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${STATUS_COLORS[result.status] || 'text-gray-600 bg-gray-50'}`}>
              ● {result.status?.replace('_', ' ').toUpperCase()}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{type === 'request' ? 'Request Number' : 'Grievance Number'}</span>
                <span className="font-mono font-medium">{result.request_number || result.grievance_number}</span>
              </div>
              {result.category && <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-medium">{result.category}</span></div>}
              {result.subject && <div className="flex justify-between text-sm"><span className="text-gray-500">Subject</span><span className="font-medium">{result.subject}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-gray-500">Submitted</span><span>{result.submitted_at ? new Date(result.submitted_at).toLocaleString() : '—'}</span></div>
            </div>

            {/* Progress Steps */}
            <div className="mt-5">
              <div className="flex justify-between relative">
                <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                {STEP_MAP[result.type]?.map((step, i) => {
                  const steps = STEP_MAP[result.type];
                  const currentIdx = steps.indexOf(result.status);
                  const isDone = i <= currentIdx;
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className="text-xs text-gray-500 mt-1 text-center capitalize">{step.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
