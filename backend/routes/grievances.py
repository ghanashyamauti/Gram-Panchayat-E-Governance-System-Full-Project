import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Grievance, GrievanceUpdate, AnalyticsLog

grievances_bp = Blueprint('grievances', __name__)

def ai_categorize_grievance(subject, description):
    text = (subject + ' ' + description).lower()
    keywords = {
        'Water Supply': ['water', 'pipe', 'tap', 'pani', 'jal', 'leakage'],
        'Roads & Infrastructure': ['road', 'pothole', 'bridge', 'rasta', 'street'],
        'Sanitation & Waste': ['garbage', 'waste', 'toilet', 'sewage', 'clean'],
        'Electricity': ['light', 'electricity', 'bijli', 'power', 'transformer'],
        'Healthcare': ['hospital', 'doctor', 'health', 'medicine', 'clinic'],
        'Education': ['school', 'teacher', 'education', 'student'],
        'Land Records': ['land', 'record', 'property', 'jamin'],
        'Corruption': ['bribe', 'corrupt', 'bhrashtachar', 'fraud'],
        'Public Safety': ['crime', 'safety', 'police', 'accident']
    }
    scores = {cat: sum(1 for w in words if w in text) for cat, words in keywords.items()}
    best = max(scores, key=scores.get)
    category = best if scores[best] > 0 else 'Other'
    high_priority = ['urgent', 'emergency', 'death', 'accident', 'serious', 'critical']
    priority = 'high' if any(w in text for w in high_priority) else 'normal'
    return {'category': category, 'priority': priority}

def generate_grievance_number():
    ts = datetime.utcnow().strftime('%Y%m%d')
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"GRV-{ts}-{suffix}"


@grievances_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_grievance():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    subject = data.get('subject', '').strip()
    description = data.get('description', '').strip()

    if not subject or not description:
        return jsonify({'success': False, 'message': 'Subject and description required'}), 400

    ai_result = ai_categorize_grievance(subject, description)

    grievance = Grievance(
        user_id=user_id,
        grievance_number=generate_grievance_number(),
        subject=subject,
        description=description,
        ai_category=ai_result['category'],
        ai_priority=ai_result['priority'],
        category=ai_result['category']
    )
    db.session.add(grievance)
    db.session.commit()

    try:
        db.session.add(AnalyticsLog(
            event_type='grievance_submitted',
            user_id=user_id,
            event_data={'grievance_number': grievance.grievance_number, 'ai_category': ai_result['category']}
        ))
        db.session.commit()
    except Exception as e:
        print(f"Analytics log error: {e}")
        db.session.rollback()

    return jsonify({'success': True, 'message': 'Grievance submitted successfully', 'grievance': grievance.to_dict()}), 201


@grievances_bp.route('/my-grievances', methods=['GET'])
@jwt_required()
def my_grievances():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    pagination = Grievance.query.filter_by(user_id=user_id)\
        .order_by(Grievance.submitted_at.desc())\
        .paginate(page=page, per_page=10, error_out=False)
    return jsonify({
        'success': True,
        'grievances': [g.to_dict() for g in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages
    }), 200


@grievances_bp.route('/<grievance_id>/status', methods=['GET'])
@jwt_required()
def grievance_status(grievance_id):
    user_id = get_jwt_identity()
    grievance = Grievance.query.filter_by(id=grievance_id, user_id=user_id).first()
    if not grievance:
        return jsonify({'success': False, 'message': 'Grievance not found'}), 404

    updates = GrievanceUpdate.query.filter_by(grievance_id=grievance_id)\
        .order_by(GrievanceUpdate.created_at.desc()).all()

    return jsonify({
        'success': True,
        'grievance': grievance.to_dict(),
        'updates': [{'update_text': u.update_text, 'status': u.status, 'created_at': u.created_at.isoformat()} for u in updates]
    }), 200


@grievances_bp.route('/track/<grievance_number>', methods=['GET'])
def track_grievance(grievance_number):
    grievance = Grievance.query.filter_by(grievance_number=grievance_number).first()
    if not grievance:
        return jsonify({'success': False, 'message': 'Grievance not found'}), 404
    return jsonify({
        'success': True,
        'grievance_number': grievance.grievance_number,
        'subject': grievance.subject,
        'status': grievance.status,
        'category': grievance.category,
        'submitted_at': grievance.submitted_at.isoformat()
    }), 200
