import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { open: 'bg-red-100 text-red-700', in_progress: 'bg-blue-100 text-blue-700', escalated: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-700' };
const PRIORITY_COLORS = { high: 'text-red-600', normal: 'text-blue-600', low: 'text-gray-600' };

export default function Grievances() {
  const [tab, setTab] = useState('submit');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [grievances, setGrievances] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const loadGrievances = () => {
    api.get('/grievances/my-grievances').then(r => setGrievances(r.data.grievances || [])).catch(()=>{});
  };

  useEffect(() => { loadGrievances(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) { toast.error('Subject and description required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/grievances/submit', { subject, description });
      setSubmitted(res.data.grievance);
      setSubject(''); setDescription('');
      toast.success('Grievance submitted!');
      loadGrievances();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to submit'); }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📢 Grievance Redressal</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('submit')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'submit' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>Submit Grievance</button>
        <button onClick={() => setTab('my')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'my' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'}`}>My Grievances ({grievances.length})</button>
      </div>

      {tab === 'submit' && (
        <div className="bg-white rounded-xl shadow p-6">
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
              <h3 className="font-semibold text-green-800">✅ Grievance Submitted</h3>
              <p className="text-sm text-green-700 mt-1">Number: <b>{submitted.grievance_number}</b></p>
              <p className="text-sm text-green-700">AI Category: <b>{submitted.ai_category}</b></p>
              <p className="text-sm text-green-700">AI Priority: <b className={PRIORITY_COLORS[submitted.ai_priority]}>{submitted.ai_priority}</b></p>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-800 mb-4">File a New Complaint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief subject of your complaint" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your complaint in detail. You can write in Marathi, Hindi, or English..." />
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
              <b>🤖 AI-Powered Categorization:</b> Your grievance will be automatically categorized and assigned to the right department by our AI system.
            </div>

            <button type="submit" disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
              {submitting ? 'Submitting...' : '📢 Submit Grievance'}
            </button>
          </form>
        </div>
      )}

      {tab === 'my' && (
        <div className="space-y-3">
          {grievances.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>No grievances submitted yet</p>
            </div>
          ) : grievances.map(g => (
            <div key={g.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{g.subject}</p>
                  <p className="text-xs font-mono text-blue-600 mt-0.5">{g.grievance_number}</p>
                  <p className="text-sm text-gray-600 mt-2">{g.description.slice(0, 150)}{g.description.length > 150 ? '...' : ''}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>Category: <b>{g.ai_category || g.category}</b></span>
                    <span>Priority: <b className={PRIORITY_COLORS[g.ai_priority]}>{g.ai_priority}</b></span>
                    <span>{new Date(g.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-700'}`}>
                  {g.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
