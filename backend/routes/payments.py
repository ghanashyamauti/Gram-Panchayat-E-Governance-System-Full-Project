import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Payment, ServiceRequest, AnalyticsLog

payments_bp = Blueprint('payments', __name__)

def generate_transaction_id():
    ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"TXN-{ts}-{suffix}"


@payments_bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_payment():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    request_id = data.get('request_id')
    amount = data.get('amount')
    purpose = data.get('purpose', 'Service Fee')

    if not amount:
        return jsonify({'success': False, 'message': 'Amount required'}), 400

    if request_id:
        service_req = ServiceRequest.query.filter_by(id=request_id, user_id=user_id).first()
        if not service_req:
            return jsonify({'success': False, 'message': 'Service request not found'}), 404

    transaction_id = generate_transaction_id()
    mock_ref = f"MOCK{random.randint(100000, 999999)}"

    payment = Payment(
        request_id=request_id,
        user_id=user_id,
        amount=amount,
        purpose=purpose,
        transaction_id=transaction_id,
        mock_reference=mock_ref,
        status='pending'
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify({
        'success': True,
        'payment_id': str(payment.id),
        'transaction_id': transaction_id,
        'mock_reference': mock_ref,
        'amount': float(amount),
        'purpose': purpose,
        'message': 'Mock payment initiated. Use /api/payments/verify to complete.'
    }), 201


@payments_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    payment_id = data.get('payment_id')
    mock_reference = data.get('mock_reference')

    payment = Payment.query.filter_by(id=payment_id, user_id=user_id, status='pending').first()
    if not payment:
        return jsonify({'success': False, 'message': 'Payment not found or already processed'}), 404

    if mock_reference:
        payment.status = 'success'
        payment.paid_at = datetime.utcnow()
        payment.payment_method = 'mock'
        db.session.commit()

        try:
            db.session.add(AnalyticsLog(
                event_type='payment_success',
                user_id=user_id,
                event_data={'transaction_id': payment.transaction_id, 'amount': float(payment.amount)}
            ))
            db.session.commit()
        except Exception as e:
            print(f"Analytics log error: {e}")
            db.session.rollback()

        return jsonify({
            'success': True,
            'message': 'Payment successful!',
            'payment': payment.to_dict(),
            'receipt_number': f"RCP-{datetime.utcnow().strftime('%Y%m%d')}-{str(payment.id)[:8].upper()}"
        }), 200
    else:
        payment.status = 'failed'
        db.session.commit()
        return jsonify({'success': False, 'message': 'Payment failed'}), 400


@payments_bp.route('/history', methods=['GET'])
@jwt_required()
def payment_history():
    user_id = get_jwt_identity()
    payments = Payment.query.filter_by(user_id=user_id)\
        .order_by(Payment.created_at.desc()).all()
    return jsonify({'success': True, 'payments': [p.to_dict() for p in payments]}), 200


@payments_bp.route('/receipt/<payment_id>', methods=['GET'])
@jwt_required()
def get_receipt(payment_id):
    user_id = get_jwt_identity()
    payment = Payment.query.filter_by(id=payment_id, user_id=user_id).first()
    if not payment or payment.status != 'success':
        return jsonify({'success': False, 'message': 'Receipt not found'}), 404

    return jsonify({
        'success': True,
        'receipt': {
            'receipt_number': f"RCP-{payment.paid_at.strftime('%Y%m%d') if payment.paid_at else 'NA'}-{str(payment.id)[:8].upper()}",
            'transaction_id': payment.transaction_id,
            'amount': float(payment.amount),
            'purpose': payment.purpose,
            'status': payment.status,
            'paid_at': payment.paid_at.isoformat() if payment.paid_at else None
        }
    }), 200
