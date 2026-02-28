import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [step, setStep] = useState('list'); // list | pay | verify | receipt
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [initiated, setInitiated] = useState(null);
  const [mockRef, setMockRef] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/payments/history').then(r => setPayments(r.data.payments || [])).catch(()=>{}); }, []);

  const initiatePayment = async () => {
    if (!amount || !purpose) { toast.error('Amount and purpose required'); return; }
    setLoading(true);
    try {
      const res = await api.post('/payments/initiate', { amount: parseFloat(amount), purpose });
      setInitiated(res.data);
      setStep('verify');
      toast('Payment initiated! Enter mock reference to complete.', { icon: '💳' });
    } catch (e) { toast.error('Failed to initiate payment'); }
    setLoading(false);
  };

  const verifyPayment = async () => {
    if (!mockRef) { toast.error('Enter mock reference'); return; }
    setLoading(true);
    try {
      const res = await api.post('/payments/verify', { payment_id: initiated.payment_id, mock_reference: mockRef });
      setReceipt(res.data);
      setStep('receipt');
      toast.success('Payment successful!');
      api.get('/payments/history').then(r => setPayments(r.data.payments || [])).catch(()=>{});
    } catch (e) { toast.error('Payment verification failed'); }
    setLoading(false);
  };

  const STATUS_COLORS = { success: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', failed: 'bg-red-100 text-red-700' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">💳 Payments</h1>

      {step === 'list' && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5 text-sm text-yellow-800">
            <b>🔧 Mock Payment Mode:</b> This is a simulated payment for development. No real money is charged.
          </div>
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Make a Payment</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input value={purpose} onChange={e => setPurpose(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Birth Certificate Fee" />
              </div>
            </div>
            <button onClick={initiatePayment} disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
              {loading ? 'Processing...' : '💳 Pay Now'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow">
            <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-800">Payment History</h2></div>
            {payments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No payment history</div>
            ) : (
              <div className="divide-y">
                {payments.map(p => (
                  <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.purpose}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.transaction_id}</p>
                      <p className="text-xs text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">₹{p.amount}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {step === 'verify' && initiated && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Complete Payment</h2>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Transaction ID: <b className="font-mono">{initiated.transaction_id}</b></p>
            <p className="text-sm text-gray-600">Amount: <b>₹{initiated.amount}</b></p>
            <p className="text-sm text-gray-600">Purpose: <b>{initiated.purpose}</b></p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm text-blue-700">
            <b>Mock Payment:</b> Enter any reference number below to simulate payment completion.
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mock Reference Number</label>
            <input value={mockRef} onChange={e => setMockRef(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. MOCK123456" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('list')} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={verifyPayment} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Verifying...' : '✅ Confirm Payment'}
            </button>
          </div>
        </div>
      )}

      {step === 'receipt' && receipt && (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-6xl mb-4">🧾</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <div className="bg-green-50 rounded-lg p-4 text-left mb-4">
            <p className="text-sm"><b>Receipt:</b> {receipt.receipt_number}</p>
            <p className="text-sm"><b>Amount:</b> ₹{receipt.payment?.amount}</p>
            <p className="text-sm"><b>Status:</b> {receipt.payment?.status}</p>
            <p className="text-sm"><b>Ref:</b> {receipt.payment?.transaction_id}</p>
          </div>
          <button onClick={() => { setStep('list'); setAmount(''); setPurpose(''); setInitiated(null); setMockRef(''); setReceipt(null); }}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800">
            Back to Payments
          </button>
        </div>
      )}
    </div>
  );
}
