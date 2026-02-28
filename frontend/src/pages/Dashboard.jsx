import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <span className="text-4xl">{icon}</span>
    </div>
  </div>
);

const ServiceCard = ({ icon, name, fee, days, id }) => (
  <Link to={`/services/apply/${id}`}
    className="bg-white rounded-xl shadow hover:shadow-md transition p-4 border hover:border-blue-400 group">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">{name}</h3>
    <p className="text-xs text-gray-500 mt-1">₹{fee} • {days} days</p>
  </Link>
);

const ICONS = ['📜','⚱️','💰','🏷️','🏠','🏘️','💧','🏗️','💒','📋'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    api.get('/services/categories').then(r => setCategories(r.data.categories || [])).catch(()=>{});
    api.get('/services/my-requests?per_page=5').then(r => setRecentRequests(r.data.requests || [])).catch(()=>{});
  }, []);

  const statusColor = s => ({ pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-purple-100 text-purple-700' }[s] || 'bg-gray-100 text-gray-700');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">नमस्ते, {user?.full_name?.split(' ')[0]}! 🙏</h1>
          <p className="text-blue-200 mt-1">Welcome to Gram Panchayat e-Governance Portal</p>
          <div className="flex gap-3 mt-4">
            <Link to="/services" className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-medium transition">Apply for Service</Link>
            <Link to="/grievances" className="bg-white text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition">File Grievance</Link>
            <Link to="/track" className="border border-white hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition">Track Application</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon="📋" label="Total Requests" value={recentRequests.length} color="border-blue-500" />
          <StatCard icon="⏳" label="Pending" value={recentRequests.filter(r=>r.status==='pending').length} color="border-yellow-500" />
          <StatCard icon="✅" label="Approved" value={recentRequests.filter(r=>r.status==='approved'||r.status==='completed').length} color="border-green-500" />
          <StatCard icon="📢" label="Grievances" value="—" color="border-orange-500" />
        </div>

        {/* Services Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Available Services</h2>
            <Link to="/services" className="text-blue-600 text-sm hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categories.slice(0, 10).map((cat, i) => (
              <ServiceCard key={cat.id} id={cat.id} icon={ICONS[i % ICONS.length]} name={cat.name} fee={cat.fee} days={cat.processing_days} />
            ))}
          </div>
        </div>

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Recent Applications</h2>
              <Link to="/services" className="text-blue-600 text-sm hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{req.category?.name || 'Service'}</p>
                    <p className="text-xs text-gray-500">{req.request_number}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
            <div className="text-2xl mb-2">📞</div>
            <h3 className="font-semibold text-blue-800">Helpline</h3>
            <p className="text-blue-700 text-sm mt-1">1800-XXX-XXXX (Toll Free)</p>
            <p className="text-xs text-blue-600 mt-1">Mon–Sat, 9AM–6PM</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5">
            <div className="text-2xl mb-2">🕐</div>
            <h3 className="font-semibold text-green-800">Office Hours</h3>
            <p className="text-green-700 text-sm mt-1">Monday to Friday</p>
            <p className="text-xs text-green-600 mt-1">10:00 AM – 5:00 PM</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-orange-800">AI Chatbot</h3>
            <p className="text-orange-700 text-sm mt-1">Get instant help in Marathi, Hindi, or English</p>
            <p className="text-xs text-orange-600 mt-1">Click the chat icon →</p>
          </div>
        </div>
      </div>
    </div>
  );
}
