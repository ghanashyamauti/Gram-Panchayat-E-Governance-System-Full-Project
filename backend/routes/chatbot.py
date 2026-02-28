from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from extensions import db
from models import ChatLog
from config import Config

chatbot_bp = Blueprint('chatbot', __name__)

SYSTEM_CONTEXT = """You are a helpful assistant for Gram Panchayat / Nagar Palika e-governance portal.
Help citizens with services, applications, grievances, payments, and document requirements.
Answer in the language the user writes in (Marathi, Hindi, or English).
Common services: Birth Certificate ₹50/7days, Death Certificate ₹50/7days, Income Certificate ₹30/10days,
Caste Certificate ₹30/15days, Marriage Certificate ₹100/7days, Water Connection ₹500/30days."""


def get_cohere_response(user_message, history=None):
    api_key = Config.COHERE_API_KEY
    if api_key:
        try:
            import cohere
            co = cohere.Client(api_key)
            chat_history = []
            if history:
                for msg in history[-6:]:
                    chat_history.append({
                        "role": "USER" if msg['role'] == 'user' else "CHATBOT",
                        "message": msg['content']
                    })
            response = co.chat(
                message=user_message,
                preamble=SYSTEM_CONTEXT,
                chat_history=chat_history,
                model='command-r',
                temperature=0.3
            )
            return response.text
        except Exception as e:
            print(f"Cohere error: {e}")
    return fallback_response(user_message)


def fallback_response(message):
    msg = message.lower()

    if any(w in msg for w in ['birth', 'janm', 'जन्म']):
        return "For Birth Certificate: Services → Apply → 'Birth Certificate'. Fee: ₹50, 7 days. Required: Hospital birth slip, parents Aadhar card."

    if any(w in msg for w in ['death', 'mrityu', 'मृत्यू']):
        return "For Death Certificate: Services → Apply → 'Death Certificate'. Fee: ₹50, 7 days. Required: Hospital death record."

    if any(w in msg for w in ['income', 'aay', 'उत्पन्न']):
        return "For Income Certificate: Services → Apply → 'Income Certificate'. Fee: ₹30, 10 days. Required: Ration card, salary slip."

    if any(w in msg for w in ['caste', 'jati', 'जात']):
        return "For Caste Certificate: Services → Apply → 'Caste Certificate'. Fee: ₹30, 15 days."

    if any(w in msg for w in ['marriage', 'vivah', 'विवाह']):
        return "For Marriage Certificate: Services → Apply → 'Marriage Certificate'. Fee: ₹100, 7 days."

    if any(w in msg for w in ['track', 'status', 'follow', 'application']):
        return "Track your application: Go to 'Track' menu → Enter your Request Number (REQ-XXXXXXXXXX)."

    if any(w in msg for w in ['grievance', 'complaint', 'taqrar', 'तक्रार']):
        return "To submit a grievance: Go to Grievances → Submit New. Describe your issue and AI will route it to the right department."

    if any(w in msg for w in ['payment', 'fee', 'pay', 'शुल्क']):
        return "Payments: After applying for a service, go to Payments → Pay Now. It is a secure mock payment system."

    if any(w in msg for w in ['document', 'upload', 'file']):
        return "To upload documents: Apply for a service first, then upload supporting documents like Aadhar card, ration card, etc."

    if any(w in msg for w in ['hello', 'hi', 'namaskar', 'namaste', 'नमस्ते']):
        return "नमस्ते! Hello! Welcome to Gram Panchayat Portal. How can I help you today?"

    if any(w in msg for w in ['help', 'madad', 'मदत']):
        return ("I can help you with:\n"
                "1. Apply for certificates (Birth, Income, Caste, Marriage etc.)\n"
                "2. Track your applications\n"
                "3. Submit grievances/complaints\n"
                "4. Payment information\n"
                "What would you like to know?")

    return "I can help with certificates, tracking applications, grievances, and payments. What do you need help with?"


@chatbot_bp.route('/message', methods=['POST'])
def chat():
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()
    session_id = data.get('session_id', 'anonymous')
    history = data.get('history', [])
    language = data.get('language', 'en')

    if not user_message:
        return jsonify({'success': False, 'message': 'Message required'}), 400

    bot_response = get_cohere_response(user_message, history)

    if user_id:
        try:
            log = ChatLog(
                user_id=user_id,
                session_id=session_id,
                user_message=user_message,
                bot_response=bot_response,
                language=language
            )
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            print(f"Chat log error: {e}")
            db.session.rollback()

    return jsonify({
        'success': True,
        'response': bot_response,
        'session_id': session_id
    }), 200


@chatbot_bp.route('/history', methods=['GET'])
@jwt_required()
def chat_history():
    user_id = get_jwt_identity()
    session_id = request.args.get('session_id')

    query = ChatLog.query.filter_by(user_id=user_id)
    if session_id:
        query = query.filter_by(session_id=session_id)

    logs = query.order_by(ChatLog.created_at.asc()).limit(50).all()

    return jsonify({
        'success': True,
        'history': [{
            'user_message': l.user_message,
            'bot_response': l.bot_response,
            'created_at': l.created_at.isoformat()
        } for l in logs]
    }), 200