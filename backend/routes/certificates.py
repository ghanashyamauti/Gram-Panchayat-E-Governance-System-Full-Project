import os
import random
import string
import qrcode
import base64
from datetime import datetime, date, timedelta
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.units import cm
from extensions import db
from models import Certificate, ServiceRequest, User
from config import Config

certificates_bp = Blueprint('certificates', __name__)


def generate_certificate_number():
    year = datetime.utcnow().year
    suffix = ''.join(random.choices(string.digits, k=8))
    return f"CERT-{year}-{suffix}"


def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def generate_certificate_pdf(cert, user, service_req):
    filename = f"cert_{cert.certificate_number}.pdf"
    filepath = os.path.join(Config.CERTIFICATE_OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    elements = []

    header_style = ParagraphStyle('header', parent=styles['Title'],
                                   fontSize=16, textColor=colors.darkblue, spaceAfter=6)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'],
                                fontSize=11, textColor=colors.grey, spaceAfter=20, alignment=1)
    body_style = ParagraphStyle('body', parent=styles['Normal'], fontSize=11, spaceAfter=10)

    elements.append(Paragraph("GRAM PANCHAYAT / NAGAR PALIKA", header_style))
    elements.append(Paragraph("Government of Maharashtra", sub_style))
    elements.append(Paragraph(f"<b>{cert.certificate_type.upper()}</b>", header_style))
    elements.append(Spacer(1, 0.5*cm))

    cert_data = [
        ['Certificate No.', cert.certificate_number],
        ['Applicant Name', user.full_name],
        ['Mobile', user.mobile],
        ['Village/Ward', user.village_ward or 'N/A'],
        ['District', user.district or 'N/A'],
        ['Date of Issue', cert.issued_at.strftime('%d/%m/%Y')],
        ['Valid Until', cert.valid_until.strftime('%d/%m/%Y') if cert.valid_until else 'Permanent'],
        ['Request No.', service_req.request_number],
    ]

    table = Table(cert_data, colWidths=[6*cm, 10*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.whitesmoke, colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.5*cm))

    cert_text = (f"This is to certify that {user.full_name}, "
                 f"resident of {user.village_ward or 'the mentioned locality'}, "
                 f"{user.district or ''}, Maharashtra, "
                 f"has been issued this {cert.certificate_type} by the competent authority.")
    elements.append(Paragraph(cert_text, body_style))
    elements.append(Spacer(1, 1*cm))

    qr_b64 = generate_qr_code(f"https://panchayat.gov.in/verify/{cert.certificate_number}")
    qr_data = base64.b64decode(qr_b64)
    qr_path = os.path.join(Config.CERTIFICATE_OUTPUT_DIR, f"qr_{cert.certificate_number}.png")
    with open(qr_path, 'wb') as f:
        f.write(qr_data)

    qr_img = RLImage(qr_path, width=3*cm, height=3*cm)
    sign_data = [[qr_img, '', Paragraph('<b>Authorized Signatory</b><br/>Gram Panchayat / Nagar Palika<br/>Government of Maharashtra', body_style)]]
    sign_table = Table(sign_data, colWidths=[4*cm, 6*cm, 6*cm])
    sign_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    elements.append(sign_table)
    elements.append(Spacer(1, 0.3*cm))

    footer_style = ParagraphStyle('footer', parent=styles['Normal'],
                                   fontSize=8, textColor=colors.grey, alignment=1)
    elements.append(Paragraph(
        f"This is a computer-generated certificate. Verify at https://panchayat.gov.in/verify/{cert.certificate_number}",
        footer_style
    ))

    doc.build(elements)
    return filename


@certificates_bp.route('/request/<request_id>', methods=['POST'])
@jwt_required()
def request_certificate(request_id):
    claims = get_jwt()
    if claims.get('role') not in ['admin', 'superadmin', 'officer']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    service_req = ServiceRequest.query.get(request_id)
    if not service_req:
        return jsonify({'success': False, 'message': 'Service request not found'}), 404

    if service_req.status != 'approved':
        return jsonify({'success': False, 'message': 'Request must be approved first'}), 400

    user = User.query.get(service_req.user_id)
    cert_type = service_req.category.name_en if service_req.category else 'Certificate'
    cert_number = generate_certificate_number()
    qr_b64 = generate_qr_code(f"https://panchayat.gov.in/verify/{cert_number}")
    admin_id = get_jwt_identity()

    cert = Certificate(
        request_id=request_id,
        user_id=service_req.user_id,
        certificate_type=cert_type,
        certificate_number=cert_number,
        qr_code=qr_b64,
        issued_by=admin_id,
        valid_until=date.today() + timedelta(days=365)
    )
    db.session.add(cert)
    db.session.flush()

    pdf_filename = generate_certificate_pdf(cert, user, service_req)
    cert.pdf_path = pdf_filename
    service_req.status = 'completed'
    service_req.resolved_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Certificate generated',
        'certificate': cert.to_dict(),
        'download_url': f"/api/certificates/download/{cert.id}"
    }), 201


@certificates_bp.route('/download/<cert_id>', methods=['GET'])
@jwt_required()
def download_certificate(cert_id):
    user_id = get_jwt_identity()
    claims = get_jwt()

    cert = Certificate.query.get(cert_id)
    if not cert:
        return jsonify({'success': False, 'message': 'Certificate not found'}), 404

    if cert.user_id != user_id and claims.get('role') not in ['admin', 'superadmin']:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    filepath = os.path.join(Config.CERTIFICATE_OUTPUT_DIR, cert.pdf_path)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'message': 'Certificate file not found'}), 404

    return send_file(filepath, as_attachment=True, download_name=f"{cert.certificate_number}.pdf")


@certificates_bp.route('/verify/<cert_number>', methods=['GET'])
def verify_certificate(cert_number):
    cert = Certificate.query.filter_by(certificate_number=cert_number).first()
    if not cert:
        return jsonify({'success': False, 'message': 'Certificate not found or invalid'}), 404

    user = User.query.get(cert.user_id)
    is_valid = cert.valid_until >= date.today() if cert.valid_until else True

    return jsonify({
        'success': True,
        'valid': is_valid,
        'certificate': {
            'certificate_number': cert.certificate_number,
            'certificate_type': cert.certificate_type,
            'holder_name': user.full_name if user else 'N/A',
            'issued_at': cert.issued_at.isoformat(),
            'valid_until': cert.valid_until.isoformat() if cert.valid_until else None,
            'status': 'Valid' if is_valid else 'Expired'
        }
    }), 200


@certificates_bp.route('/my-certificates', methods=['GET'])
@jwt_required()
def my_certificates():
    user_id = get_jwt_identity()
    certs = Certificate.query.filter_by(user_id=user_id)\
        .order_by(Certificate.issued_at.desc()).all()
    return jsonify({'success': True, 'certificates': [c.to_dict() for c in certs]}), 200