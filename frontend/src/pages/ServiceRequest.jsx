import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ServiceRequest() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/services/categories').then(r => {
      const cat = r.data.categories?.find(c => c.id === parseInt(categoryId));
      setCategory(cat);
    }).catch(()=>{});
  }, [categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/services/apply', { category_id: parseInt(categoryId), description });
      setSubmitted(res.data.request);
      toast.success('Application submitted!');

      // Upload files if any
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          await api.post(`/services/${res.data.request.id}/upload`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        setUploading(false);
        toast.success('Documents uploaded!');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submission failed');
    }
    setSubmitting(false);
  };

  if (!category) return <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>;

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
        <div className="bg-blue-50 rounded-lg p-4 my-4">
          <p className="text-sm text-gray-600">Your Request Number</p>
          <p className="text-xl font-bold text-blue-700 font-mono">{submitted.request_number}</p>
        </div>
        <p className="text-gray-500 text-sm mb-2">Processing Time: {category.processing_days} days</p>
        <p className="text-gray-500 text-sm mb-6">Fee: ₹{category.fee}</p>
        {uploading && <p className="text-blue-600 text-sm mb-4">Uploading documents...</p>}
        <div className="flex gap-3">
          <button onClick={() => navigate('/services')} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">My Applications</button>
          <button onClick={() => navigate('/track')} className="flex-1 bg-blue-700 text-white py-2 rounded-lg text-sm hover:bg-blue-800">Track Status</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 text-white px-6 py-5">
          <button onClick={() => navigate(-1)} className="text-blue-200 text-sm mb-2 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold">{category.name}</h1>
          <p className="text-blue-200 text-sm">{category.description}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span>💰 Fee: ₹{category.fee}</span>
            <span>⏱ Processing: {category.processing_days} days</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Additional Details</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Briefly describe your purpose for this certificate..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Supporting Documents</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={e => setFiles(Array.from(e.target.files))}
                className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, DOC up to 10MB each</p>
              </label>
              {files.length > 0 && (
                <div className="mt-3 text-left">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                      <span>📄</span> {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Required docs hint */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">📋 Documents Required</h3>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Aadhar Card (mandatory)</li>
              <li>• Ration Card / Voter ID</li>
              <li>• Any relevant proof for {category.name}</li>
              <li>• Passport-size photo (optional)</li>
            </ul>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
