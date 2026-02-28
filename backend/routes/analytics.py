from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import ServiceRequest, Grievance, Payment, User, AnalyticsLog
from sqlalchemy import func, cast, Date

analytics_bp = Blueprint('analytics', __name__)

def require_admin(identity):
    return identity.get('role') in ['admin', 'superadmin', 'officer']


@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
def overview():
    identity = get_jwt_identity()
    if not require_admin(identity):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    # Service requests by status
    req_by_status = db.session.query(
        ServiceRequest.status,
        func.count(ServiceRequest.id).label('count')
    ).group_by(ServiceRequest.status).all()

    # Grievances by category
    grv_by_category = db.session.query(
        Grievance.category,
        func.count(Grievance.id).label('count')
    ).group_by(Grievance.category).all()

    # Revenue total
    total_revenue = db.session.query(func.sum(Payment.amount)).filter_by(status='success').scalar() or 0

    # Users registered over time (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users = User.query.filter(User.created_at >= thirty_days_ago).count()

    return jsonify({
        'success': True,
        'analytics': {
            'service_requests_by_status': {r.status: r.count for r in req_by_status},
            'grievances_by_category': {g.category or 'Uncategorized': g.count for g in grv_by_category},
            'total_revenue': float(total_revenue),
            'new_users_last_30_days': new_users,
            'total_users': User.query.count(),
            'total_requests': ServiceRequest.query.count(),
            'total_grievances': Grievance.query.count()
        }
    }), 200


@analytics_bp.route('/service-trends', methods=['GET'])
@jwt_required()
def service_trends():
    identity = get_jwt_identity()
    if not require_admin(identity):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    from models import ServiceCategory
    service_usage = db.session.query(
        ServiceCategory.name_en,
        func.count(ServiceRequest.id).label('count')
    ).join(ServiceRequest, ServiceRequest.category_id == ServiceCategory.id)\
     .group_by(ServiceCategory.name_en)\
     .order_by(func.count(ServiceRequest.id).desc()).all()

    return jsonify({
        'success': True,
        'service_trends': [{'service': s.name_en, 'count': s.count} for s in service_usage]
    }), 200


@analytics_bp.route('/grievance-trends', methods=['GET'])
@jwt_required()
def grievance_trends():
    identity = get_jwt_identity()
    if not require_admin(identity):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    by_priority = db.session.query(
        Grievance.ai_priority,
        func.count(Grievance.id).label('count')
    ).group_by(Grievance.ai_priority).all()

    by_status = db.session.query(
        Grievance.status,
        func.count(Grievance.id).label('count')
    ).group_by(Grievance.status).all()

    return jsonify({
        'success': True,
        'grievance_trends': {
            'by_priority': {g.ai_priority or 'unknown': g.count for g in by_priority},
            'by_status': {g.status: g.count for g in by_status}
        }
    }), 200
