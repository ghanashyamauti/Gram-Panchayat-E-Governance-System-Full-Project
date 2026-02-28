from datetime import datetime
import uuid
from extensions import db

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    full_name = db.Column(db.String(150), nullable=False)
    mobile = db.Column(db.String(15), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True)
    aadhar_number = db.Column(db.String(20), unique=True)
    address = db.Column(db.Text)
    village_ward = db.Column(db.String(100))
    district = db.Column(db.String(100))
    state = db.Column(db.String(100), default='Maharashtra')
    profile_photo = db.Column(db.Text)
    language_preference = db.Column(db.String(10), default='en')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'mobile': self.mobile,
            'email': self.email,
            'aadhar_number': self.aadhar_number,
            'address': self.address,
            'village_ward': self.village_ward,
            'district': self.district,
            'state': self.state,
            'language_preference': self.language_preference,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OTPLog(db.Model):
    __tablename__ = 'otp_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    mobile = db.Column(db.String(15), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(50), default='login')
    is_used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    full_name = db.Column(db.String(150))
    role = db.Column(db.String(50), default='admin')
    department = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'department': self.department
        }


class ServiceCategory(db.Model):
    __tablename__ = 'service_categories'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name_en = db.Column(db.String(100), nullable=False)
    name_hi = db.Column(db.String(100))
    name_mr = db.Column(db.String(100))
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))
    fee = db.Column(db.Numeric(10, 2), default=0)
    processing_days = db.Column(db.Integer, default=7)
    required_docs = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self, lang='en'):
        name = self.name_en
        if lang == 'hi' and self.name_hi:
            name = self.name_hi
        elif lang == 'mr' and self.name_mr:
            name = self.name_mr
        return {
            'id': self.id,
            'name': name,
            'name_en': self.name_en,
            'name_hi': self.name_hi,
            'name_mr': self.name_mr,
            'description': self.description,
            'icon': self.icon,
            'fee': float(self.fee),
            'processing_days': self.processing_days,
            'required_docs': self.required_docs
        }


class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('service_categories.id'))
    request_number = db.Column(db.String(30), unique=True, nullable=False)
    status = db.Column(db.String(30), default='pending')
    priority = db.Column(db.String(20), default='normal')
    description = db.Column(db.Text)
    remarks = db.Column(db.Text)
    assigned_to = db.Column(db.String(36), db.ForeignKey('admins.id'))
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

    user = db.relationship('User', foreign_keys=[user_id])
    category = db.relationship('ServiceCategory', foreign_keys=[category_id])

    def to_dict(self):
        return {
            'id': self.id,
            'request_number': self.request_number,
            'category': self.category.to_dict() if self.category else None,
            'status': self.status,
            'priority': self.priority,
            'description': self.description,
            'remarks': self.remarks,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }


class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    request_id = db.Column(db.String(36), db.ForeignKey('service_requests.id'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.Text)
    file_type = db.Column(db.String(50))
    file_size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'file_name': self.file_name,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat()
        }


class Grievance(db.Model):
    __tablename__ = 'grievances'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    grievance_number = db.Column(db.String(30), unique=True, nullable=False)
    category = db.Column(db.String(100))
    subject = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    ai_category = db.Column(db.String(100))
    ai_priority = db.Column(db.String(20))
    status = db.Column(db.String(30), default='open')
    assigned_to = db.Column(db.String(36), db.ForeignKey('admins.id'))
    escalation_level = db.Column(db.Integer, default=0)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'grievance_number': self.grievance_number,
            'category': self.category,
            'subject': self.subject,
            'description': self.description,
            'ai_category': self.ai_category,
            'ai_priority': self.ai_priority,
            'status': self.status,
            'escalation_level': self.escalation_level,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class GrievanceUpdate(db.Model):
    __tablename__ = 'grievance_updates'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    grievance_id = db.Column(db.String(36), db.ForeignKey('grievances.id'))
    updated_by = db.Column(db.String(36), db.ForeignKey('admins.id'))
    update_text = db.Column(db.Text)
    status = db.Column(db.String(30))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    request_id = db.Column(db.String(36), db.ForeignKey('service_requests.id'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    purpose = db.Column(db.String(255))
    transaction_id = db.Column(db.String(100), unique=True)
    status = db.Column(db.String(30), default='pending')
    payment_method = db.Column(db.String(50), default='mock')
    mock_reference = db.Column(db.String(50))
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'amount': float(self.amount),
            'purpose': self.purpose,
            'transaction_id': self.transaction_id,
            'status': self.status,
            'payment_method': self.payment_method,
            'mock_reference': self.mock_reference,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat()
        }


class Certificate(db.Model):
    __tablename__ = 'certificates'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    request_id = db.Column(db.String(36), db.ForeignKey('service_requests.id'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    certificate_type = db.Column(db.String(100))
    certificate_number = db.Column(db.String(50), unique=True)
    qr_code = db.Column(db.Text)
    pdf_path = db.Column(db.Text)
    issued_by = db.Column(db.String(36), db.ForeignKey('admins.id'))
    valid_until = db.Column(db.Date)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'certificate_type': self.certificate_type,
            'certificate_number': self.certificate_number,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'issued_at': self.issued_at.isoformat()
        }


class ChatLog(db.Model):
    __tablename__ = 'chat_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    session_id = db.Column(db.String(100))
    user_message = db.Column(db.Text)
    bot_response = db.Column(db.Text)
    language = db.Column(db.String(10), default='en')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AnalyticsLog(db.Model):
    __tablename__ = 'analytics_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    event_type = db.Column(db.String(100))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    event_data = db.Column(db.JSON)   # renamed from 'metadata' (reserved by SQLAlchemy)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
