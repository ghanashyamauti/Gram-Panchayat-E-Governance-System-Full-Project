import os
import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from extensions import db
from models import ServiceCategory, ServiceRequest, Document, AnalyticsLog
from config import Config

services_bp = Blueprint('services', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def generate_request_number():
    ts = datetime.utcnow().strftime('%Y%m%d')
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"REQ-{ts}-{suffix}"


@services_bp.route('/categories', methods=['GET'])
def get_categories():
    lang = request.args.get('lang', 'en')
    categories = ServiceCategory.query.filter_by(is_active=True).all()
    return jsonify({
        'success': True,
        'categories': [c.to_dict(lang) for c in categories]
    }), 200


@services_bp.route('/apply', methods=['POST'])
@jwt_required()
def apply_service():
    user_id = get_jwt_identity()

    data = request.get_json(silent=True) or {}
    category_id = data.get('category_id')
    description = data.get('description', '')

    if not category_id:
        return jsonify({'success': False, 'message': 'category_id is required'}), 400

    category = ServiceCategory.query.get(category_id)
    if not category:
        return jsonify({'success': False, 'message': 'Invalid category'}), 404

    req_number = generate_request_number()
    service_req = ServiceRequest(
        user_id=user_id,
        category_id=category_id,
        request_number=req_number,
        description=description,
        status='pending'
    )
    db.session.add(service_req)
    db.session.commit()

    try:
        db.session.add(AnalyticsLog(
            event_type='service_applied',
            user_id=user_id,
            event_data={'category': category.name_en, 'request_number': req_number}
        ))
        db.session.commit()
    except Exception as e:
        print(f"Analytics log error: {e}")
        db.session.rollback()

    return jsonify({
        'success': True,
        'message': 'Service request submitted successfully',
        'request': service_req.to_dict()
    }), 201


@services_bp.route('/<request_id>/upload', methods=['POST'])
@jwt_required()
def upload_document(request_id):
    user_id = get_jwt_identity()

    service_req = ServiceRequest.query.filter_by(id=request_id, user_id=user_id).first()
    if not service_req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'File type not allowed'}), 400

    filename = secure_filename(file.filename)
    unique_name = f"{request_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
    file_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    file.save(file_path)

    doc = Document(
        request_id=request_id,
        user_id=user_id,
        file_name=filename,
        file_path=unique_name,
        file_type=file.content_type,
        file_size=os.path.getsize(file_path)
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({'success': True, 'document': doc.to_dict()}), 201


@services_bp.route('/my-requests', methods=['GET'])
@jwt_required()
def my_requests():
    user_id = get_jwt_identity()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')

    query = ServiceRequest.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(ServiceRequest.submitted_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'success': True,
        'requests': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200


@services_bp.route('/<request_id>/status', methods=['GET'])
@jwt_required()
def track_request(request_id):
    user_id = get_jwt_identity()

    service_req = ServiceRequest.query.filter_by(id=request_id, user_id=user_id).first()
    if not service_req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404

    docs = Document.query.filter_by(request_id=request_id).all()

    return jsonify({
        'success': True,
        'request': service_req.to_dict(),
        'documents': [d.to_dict() for d in docs]
    }), 200


@services_bp.route('/track/<request_number>', methods=['GET'])
def track_by_number(request_number):
    service_req = ServiceRequest.query.filter_by(request_number=request_number).first()
    if not service_req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404

    return jsonify({
        'success': True,
        'request_number': service_req.request_number,
        'status': service_req.status,
        'submitted_at': service_req.submitted_at.isoformat(),
        'updated_at': service_req.updated_at.isoformat(),
        'category': service_req.category.name_en if service_req.category else None
    }), 200