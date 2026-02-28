import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ICONS = ['📜','⚱️','💰','🏷️','🏠','🏘️','💧','🏗️','💒','📋'];
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-purple-100 text-purple-700' };

export default function Services() {
  const [categories, setCategories] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [tab, setTab] = useState('apply');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/services/categories?lang=${lang}`),
      api.get('/services/my-requests')
    ]).then(([catRes, reqRes]) => {
      setCategories(catRes.data.categories || []);
      setMyRequests(reqRes.data.requests || []);
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false));
  }, [lang]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-xl text-gray-500">Loading services...</div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Government Services</h1>
        <select value={lang} onChange={e => setLang(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('apply')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'apply' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Apply for Service</button>
        <button onClick={() => setTab('my')} className={`px-4 py-2 rounded-lg font-medium text-sm ${tab === 'my' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>My Applications ({myRequests.length})</button>
      </div>

      {tab === 'apply' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <div key={cat.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-5 border hover:border-blue-400">
              <div className="text-4xl mb-3">{ICONS[i % ICONS.length]}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{cat.name}</h3>
              <p className="text-gray-500 text-xs mb-3">{cat.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                <span>💰 ₹{cat.fee}</span>
                <span>⏱ {cat.processing_days} days</span>
              </div>
              <Link to={`/services/apply/${cat.id}`}
                className="block text-center bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm font-medium transition">
                Apply Now →
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === 'my' && (
        <div className="bg-white rounded-xl shadow">
          {myRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>No applications yet</p>
              <button onClick={() => setTab('apply')} className="mt-3 text-blue-600 text-sm hover:underline">Apply for a service →</button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Request No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-blue-700">{req.request_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{req.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(req.submitted_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
