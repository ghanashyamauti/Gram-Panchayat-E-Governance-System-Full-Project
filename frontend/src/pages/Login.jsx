import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [step, setStep] = useState('mobile'); // mobile | otp | register
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const sendOtp = async () => {
    if (mobile.length !== 10) { toast.error('Enter valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { mobile });
      if (res.data.success) {
        toast.success('OTP sent!');
        if (res.data.dev_otp) {
          setDevOtp(res.data.dev_otp);
          toast('Dev OTP: ' + res.data.dev_otp, { icon: '🔑', duration: 10000 });
        }
        setStep('otp');
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send OTP'); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      // First try without name (existing user)
      const res = await api.post('/auth/verify-otp', { mobile, otp });
      if (res.data.success) {
        login(res.data.token, res.data.user);
        toast.success('Welcome ' + res.data.user.full_name + '!');
        navigate('/');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'OTP verification failed';
      if (msg.includes('Full name required')) {
        // New user — ask for name
        setStep('register');
        toast('New user! Please enter your name to register.', { icon: '👤' });
      } else if (msg.includes('Invalid OTP') || msg.includes('expired')) {
        toast.error('Invalid or expired OTP. Click Send OTP again.');
        setOtp('');
      } else {
        toast.error(msg);
      }
    }
    setLoading(false);
  };

  const registerUser = async () => {
    if (!fullName.trim()) { toast.error('Please enter your full name'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { mobile, otp, full_name: fullName });
      if (res.data.success) {
        login(res.data.token, res.data.user);
        toast.success('Welcome ' + res.data.user.full_name + '!');
        navigate('/');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Registration failed';
      if (msg.includes('Invalid OTP') || msg.includes('expired')) {
        toast.error('OTP expired. Please go back and send a new OTP.');
        setStep('mobile');
        setOtp('');
      } else {
        toast.error(msg);
      }
    }
    setLoading(false);
  };

  const adminLogin = async () => {
    if (!adminUser || !adminPass) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', { username: adminUser, password: adminPass });
      if (res.data.success) {
        login(res.data.token, { ...res.data.admin, role: res.data.admin.role });
        toast.success('Admin logged in!');
        navigate('/admin');
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 p-1">
          <div className="bg-blue-900 text-white text-center py-6 px-4">
            <div className="text-4xl mb-2">🏛️</div>
            <h1 className="text-2xl font-bold">ग्राम पंचायत</h1>
            <p className="text-blue-200 text-sm">Gram Panchayat / Nagar Palika</p>
            <p className="text-xs text-blue-300 mt-1">e-Governance Portal • Maharashtra</p>
          </div>
        </div>

        <div className="p-8">
          {/* Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setIsAdmin(false); setStep('mobile'); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${!isAdmin ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
              👤 Citizen
            </button>
            <button onClick={() => setIsAdmin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${isAdmin ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
              🔐 Admin
            </button>
          </div>

          {!isAdmin ? (
            <>
              {/* STEP 1 — Mobile */}
              {step === 'mobile' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Login with Mobile OTP</h2>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 text-sm">+91</span>
                      <input type="tel" maxLength={10} value={mobile}
                        onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && sendOtp()}
                        className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter 10-digit number" autoFocus />
                    </div>
                  </div>
                  <button onClick={sendOtp} disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
                    {loading ? 'Sending...' : 'Send OTP →'}
                  </button>
                </div>
              )}

              {/* STEP 2 — OTP */}
              {step === 'otp' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">Enter OTP</h2>
                  <p className="text-gray-500 text-sm mb-4">OTP sent to +91 {mobile}</p>

                  {devOtp && (
                    <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-lg p-3 text-sm mb-4">
                      🔑 <b>Dev Mode OTP: {devOtp}</b>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                    <input type="text" maxLength={6} value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123456" autoFocus />
                  </div>

                  <button onClick={verifyOtp} disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
                    {loading ? 'Verifying...' : '✓ Verify OTP'}
                  </button>
                  <button onClick={() => { setStep('mobile'); setOtp(''); setDevOtp(''); }}
                    className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">
                    ← Change mobile number
                  </button>
                </div>
              )}

              {/* STEP 3 — Register (new users only) */}
              {step === 'register' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">Complete Registration</h2>
                  <p className="text-gray-500 text-sm mb-4">First time login — please enter your name</p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && registerUser()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name" autoFocus />
                  </div>

                  <button onClick={registerUser} disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
                    {loading ? 'Registering...' : '✓ Complete Registration'}
                  </button>
                  <button onClick={() => { setStep('mobile'); setOtp(''); setDevOtp(''); setFullName(''); }}
                    className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">
                    ← Start over
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Admin Login */
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Admin Login</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input value={adminUser} onChange={e => setAdminUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin" autoFocus />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adminLogin()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••" />
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded-lg mb-4">
                🔐 Default: <b>admin</b> / <b>Admin@123</b>
              </div>
              <button onClick={adminLogin} disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
                {loading ? 'Logging in...' : 'Login as Admin →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
