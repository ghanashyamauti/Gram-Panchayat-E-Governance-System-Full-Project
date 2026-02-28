import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';

const QUICK_QUESTIONS = [
  'How to get Birth Certificate?',
  'What is the fee for Income Certificate?',
  'How to track my application?',
  'How to file a grievance?',
  'जन्म दाखला कसा मिळवायचा?',
  'जन्म प्रमाण पत्र के लिए क्या चाहिए?'
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', content: 'नमस्ते! Hello! Welcome to Gram Panchayat e-Governance Portal. How can I help you today? You can type in English, Hindi, or Marathi.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');
  const messagesEndRef = useRef(null);
  const sessionId = useRef('sess_' + Date.now());

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      const res = await api.post('/chatbot/message', { message: userMsg, session_id: sessionId.current, history, language: lang });
      setMessages(prev => [...prev, { role: 'bot', content: res.data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I could not process your request. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition">
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <div className="font-semibold text-sm">AI Assistant</div>
                <div className="text-xs text-blue-200">Gram Panchayat</div>
              </div>
            </div>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="bg-blue-600 text-white text-xs border-0 rounded px-2 py-1 focus:outline-none">
              <option value="en">EN</option>
              <option value="hi">हिं</option>
              <option value="mr">म</option>
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-500">
                  <span className="animate-pulse">Typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Quick questions:</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type a message..." disabled={loading} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 transition">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
