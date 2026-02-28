import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, icon, color }) => (
  <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div><p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p><p className="text-3xl font-bold text-gray-800 mt-1">{value}</p></div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dashRes, reqRes, grvRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get(`/admin/requests${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/admin/grievances')
      ]);
      setStats(dashRes.data.stats);
      setRequests(reqRes.data.requests || []);
      setGrievances(grvRes.data.grievances || []);
    } catch (e) { toast.error('Failed to load admin data'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const updateRequest = async (id, status, remarks = '') => {
    try {
      await api.put(`/admin/requests/${id}/update`, { status, remarks });
      toast.success(`Request ${status}!`);
      loadData();
    } catch (e) { toast.error('Update failed'); }
  };

  const updateGrievance = async (id, status, text = '') => {
    try {
      await api.put(`/admin/grievances/${id}/update`, { status, update_text: text });
      toast.success('Grievance updated!');
      loadData();
    } catch (e) { toast.error('Update failed'); }
  };

  const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-purple-100 text-purple-700', open: 'bg-red-100 text-red-700', in_progress: 'bg-blue-100 text-blue-700', escalated: 'bg-orange-100 text-orange-700', resolved: 'bg-green-100 text-green-700' };

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading admin panel...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Nav */}
      <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <div className="font-bold">Admin Panel</div>
            <div className="text-xs text-gray-400">Gram Panchayat e-Governance</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.full_name} • {user?.role}</span>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Logout</button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-52 bg-gray-800 text-white flex-shrink-0">
          {[['dashboard','📊 Dashboard'],['requests','📋 Requests'],['grievances','📢 Grievances']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition ${tab === key ? 'bg-gray-700 border-r-2 border-blue-400' : ''}`}>
              {label}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Tab */}
          {tab === 'dashboard' && stats && (
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Overview Dashboard</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Requests" value={stats.service_requests.total} icon="📋" color="border-blue-500" />
                <StatCard label="Pending" value={stats.service_requests.pending} icon="⏳" color="border-yellow-500" />
                <StatCard label="Completed" value={stats.service_requests.completed} icon="✅" color="border-green-500" />
                <StatCard label="Open Grievances" value={stats.grievances.open} icon="📢" color="border-red-500" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Service Requests</h3>
                  {Object.entries(stats.service_requests).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="capitalize text-gray-600">{k}</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Grievances</h3>
                  {Object.entries(stats.grievances).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="capitalize text-gray-600">{k}</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Users</span>
                      <span className="font-bold">{stats.users.total}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Total Revenue</span>
                      <span className="font-bold text-green-600">₹{stats.revenue.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {tab === 'requests' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-bold text-gray-800">Service Requests</h1>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">All Status</option>
                  {['pending','processing','approved','rejected','completed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['Request No.','User','Service','Submitted','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-blue-600 text-xs">{req.request_number}</td>
                        <td className="px-4 py-3">{req.user?.full_name}<div className="text-xs text-gray-400">{req.user?.mobile}</div></td>
                        <td className="px-4 py-3">{req.category?.name_en || req.category?.name}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(req.submitted_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {req.status === 'pending' && <>
                              <button onClick={() => updateRequest(req.id, 'approved')} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">Approve</button>
                              <button onClick={() => updateRequest(req.id, 'rejected', 'Incomplete documents')} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200">Reject</button>
                            </>}
                            {req.status === 'approved' && <button onClick={() => updateRequest(req.id, 'completed')} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs hover:bg-purple-200">Complete</button>}
                            {req.status === 'pending' && <button onClick={() => updateRequest(req.id, 'processing')} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">Process</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {requests.length === 0 && <div className="text-center py-10 text-gray-500">No requests found</div>}
              </div>
            </div>
          )}

          {/* Grievances Tab */}
          {tab === 'grievances' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-5">Grievances</h1>
              <div className="space-y-3">
                {grievances.map(g => (
                  <div key={g.id} className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{g.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status]}`}>{g.status}</span>
                        </div>
                        <p className="text-xs font-mono text-blue-600">{g.grievance_number}</p>
                        <p className="text-sm text-gray-600 mt-1">{g.description?.slice(0, 120)}...</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>User: <b>{g.user?.full_name}</b></span>
                          <span>Category: <b>{g.ai_category}</b></span>
                          <span>Priority: <b>{g.ai_priority}</b></span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {g.status === 'open' && <>
                          <button onClick={() => updateGrievance(g.id, 'in_progress', 'Under review')} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200">Review</button>
                          <button onClick={() => updateGrievance(g.id, 'escalated', 'Escalated to senior officer')} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs hover:bg-orange-200">Escalate</button>
                        </>}
                        {g.status !== 'resolved' && g.status !== 'closed' && <button onClick={() => updateGrievance(g.id, 'resolved', 'Issue resolved')} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">Resolve</button>}
                      </div>
                    </div>
                  </div>
                ))}
                {grievances.length === 0 && <div className="bg-white rounded-xl shadow text-center py-10 text-gray-500">No grievances found</div>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
