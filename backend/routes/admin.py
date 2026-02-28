from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import ServiceRequest, Grievance, GrievanceUpdate, Payment, User, Admin, AnalyticsLog

admin_bp = Blueprint('admin', __name__)

def require_admin():
    claims = get_jwt()
    return claims.get('role') in ['admin', 'superadmin', 'officer']


@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    total_requests = ServiceRequest.query.count()
    pending = ServiceRequest.query.filter_by(status='pending').count()
    approved = ServiceRequest.query.filter_by(status='approved').count()
    completed = ServiceRequest.query.filter_by(status='completed').count()
    rejected = ServiceRequest.query.filter_by(status='rejected').count()

    total_grievances = Grievance.query.count()
    open_grievances = Grievance.query.filter_by(status='open').count()
    escalated = Grievance.query.filter_by(status='escalated').count()

    total_users = User.query.count()

    from sqlalchemy import func
    revenue = db.session.query(func.sum(Payment.amount)).filter_by(status='success').scalar() or 0

    return jsonify({
        'success': True,
        'stats': {
            'service_requests': {
                'total': total_requests,
                'pending': pending,
                'approved': approved,
                'completed': completed,
                'rejected': rejected
            },
            'grievances': {
                'total': total_grievances,
                'open': open_grievances,
                'escalated': escalated,
                'resolved': Grievance.query.filter_by(status='resolved').count()
            },
            'users': {'total': total_users},
            'revenue': {'total': float(revenue)}
        }
    }), 200


@admin_bp.route('/requests', methods=['GET'])
@jwt_required()
def list_requests():
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)

    query = ServiceRequest.query
    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(ServiceRequest.submitted_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    requests_data = []
    for r in pagination.items:
        d = r.to_dict()
        if r.user:
            d['user'] = {'full_name': r.user.full_name, 'mobile': r.user.mobile}
        requests_data.append(d)

    return jsonify({
        'success': True,
        'requests': requests_data,
        'total': pagination.total,
        'pages': pagination.pages
    }), 200


@admin_bp.route('/requests/<request_id>/update', methods=['PUT'])
@jwt_required()
def update_request(request_id):
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.get_json()
    new_status = data.get('status')
    remarks = data.get('remarks', '')

    valid_statuses = ['pending', 'processing', 'approved', 'rejected', 'completed']
    if new_status not in valid_statuses:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    service_req = ServiceRequest.query.get(request_id)
    if not service_req:
        return jsonify({'success': False, 'message': 'Request not found'}), 404

    service_req.status = new_status
    service_req.remarks = remarks
    service_req.assigned_to = get_jwt_identity()
    service_req.updated_at = datetime.utcnow()

    if new_status in ['approved', 'completed', 'rejected']:
        service_req.resolved_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Request status updated to {new_status}',
        'request': service_req.to_dict()
    }), 200


@admin_bp.route('/grievances', methods=['GET'])
@jwt_required()
def list_grievances():
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    status = request.args.get('status')
    category = request.args.get('category')
    page = request.args.get('page', 1, type=int)

    query = Grievance.query
    if status:
        query = query.filter_by(status=status)
    if category:
        query = query.filter_by(category=category)

    pagination = query.order_by(Grievance.submitted_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    grievances_data = []
    for g in pagination.items:
        d = g.to_dict()
        if g.user:
            d['user'] = {'full_name': g.user.full_name, 'mobile': g.user.mobile}
        grievances_data.append(d)

    return jsonify({
        'success': True,
        'grievances': grievances_data,
        'total': pagination.total,
        'pages': pagination.pages
    }), 200


@admin_bp.route('/grievances/<grievance_id>/update', methods=['PUT'])
@jwt_required()
def update_grievance(grievance_id):
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.get_json()
    new_status = data.get('status')
    update_text = data.get('update_text', '')
    escalate = data.get('escalate', False)

    grievance = Grievance.query.get(grievance_id)
    if not grievance:
        return jsonify({'success': False, 'message': 'Grievance not found'}), 404

    if new_status:
        grievance.status = new_status
    if escalate:
        grievance.escalation_level += 1
        grievance.status = 'escalated'

    grievance.assigned_to = get_jwt_identity()
    grievance.updated_at = datetime.utcnow()

    if new_status == 'resolved':
        grievance.resolved_at = datetime.utcnow()

    update = GrievanceUpdate(
        grievance_id=grievance_id,
        updated_by=get_jwt_identity(),
        update_text=update_text,
        status=grievance.status
    )
    db.session.add(update)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Grievance updated',
        'grievance': grievance.to_dict()
    }), 200


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')

    query = User.query
    if search:
        query = query.filter(
            (User.full_name.ilike(f'%{search}%')) |
            (User.mobile.ilike(f'%{search}%'))
        )

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return jsonify({
        'success': True,
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages
    }), 200


@admin_bp.route('/revenue', methods=['GET'])
@jwt_required()
def revenue_report():
    if not require_admin():
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    from sqlalchemy import func
    payments = db.session.query(
        Payment.purpose,
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount).label('total')
    ).filter_by(status='success').group_by(Payment.purpose).all()

    return jsonify({
        'success': True,
        'revenue': [{
            'purpose': p.purpose,
            'count': p.count,
            'total': float(p.total)
        } for p in payments]
    }), 200
