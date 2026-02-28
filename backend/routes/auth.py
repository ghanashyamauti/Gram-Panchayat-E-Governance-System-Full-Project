import random
import string
import bcrypt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import User, OTPLog, AnalyticsLog
from config import Config

auth_bp = Blueprint('auth', __name__)

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    mobile = data.get('mobile', '').strip()

    if not mobile or len(mobile) != 10 or not mobile.isdigit():
        return jsonify({'success': False, 'message': 'Invalid mobile number'}), 400

    OTPLog.query.filter_by(mobile=mobile, is_used=False).update({'is_used': True})
    db.session.commit()

    otp = '123456' if Config.MOCK_OTP else generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=Config.OTP_EXPIRY_MINUTES)

    otp_log = OTPLog(mobile=mobile, otp_code=otp, expires_at=expires_at, purpose='login')
    db.session.add(otp_log)
    db.session.commit()

    response = {'success': True, 'message': f'OTP sent to {mobile}'}
    if Config.MOCK_OTP:
        response['dev_otp'] = otp
    return jsonify(response), 200


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    mobile = data.get('mobile', '').strip()
    otp = data.get('otp', '').strip()
    full_name = data.get('full_name', '').strip()

    if not mobile or not otp:
        return jsonify({'success': False, 'message': 'Mobile and OTP required'}), 400

    otp_record = OTPLog.query.filter_by(
        mobile=mobile,
        otp_code=otp,
        is_used=False
    ).order_by(OTPLog.created_at.desc()).first()

    if not otp_record:
        return jsonify({'success': False, 'message': 'Invalid OTP'}), 401
    if otp_record.expires_at < datetime.utcnow():
        return jsonify({'success': False, 'message': 'OTP expired'}), 401

    otp_record.is_used = True
    db.session.commit()

    user = User.query.filter_by(mobile=mobile).first()
    is_new = False

    if not user:
        if not full_name:
            return jsonify({'success': False, 'message': 'Full name required for registration'}), 400
        user = User(mobile=mobile, full_name=full_name)
        db.session.add(user)
        db.session.commit()
        is_new = True

    token = create_access_token(
        identity=user.id,
        additional_claims={'role': 'user'}
    )

    log = AnalyticsLog(
        event_type='user_login',
        user_id=user.id,
        event_data={'mobile': mobile},
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict(),
        'is_new_user': is_new
    }), 200


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    return jsonify({'success': True, 'user': user.to_dict()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = request.get_json()
    for field in ['full_name', 'email', 'aadhar_number', 'address', 'village_ward', 'district', 'language_preference']:
        if field in data:
            setattr(user, field, data[field])

    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()}), 200


@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    from models import Admin
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    admin = Admin.query.filter_by(username=username, is_active=True).first()
    if not admin:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(password.encode(), admin.password_hash.encode()):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    token = create_access_token(
        identity=admin.id,
        additional_claims={'role': admin.role}
    )
    return jsonify({'success': True, 'token': token, 'admin': admin.to_dict()}), 200