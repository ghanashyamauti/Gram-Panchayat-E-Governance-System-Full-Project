import os
from flask import Flask
from config import Config
from extensions import db, jwt
from flask_cors import CORS
import bcrypt

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['SQLALCHEMY_DATABASE_URI'] = Config.DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

    db.init_app(app)
    jwt.init_app(app)

    # Allow all origins (dev mode)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(Config.CERTIFICATE_OUTPUT_DIR, exist_ok=True)

    from routes.auth import auth_bp
    from routes.services import services_bp
    from routes.grievances import grievances_bp
    from routes.payments import payments_bp
    from routes.certificates import certificates_bp
    from routes.admin import admin_bp
    from routes.chatbot import chatbot_bp
    from routes.analytics import analytics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(grievances_bp, url_prefix='/api/grievances')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(certificates_bp, url_prefix='/api/certificates')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(chatbot_bp, url_prefix='/api/chatbot')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Gram Panchayat API Running', 'version': '2.0'}

    with app.app_context():
        db.create_all()
        _seed_initial_data()

    return app


def _seed_initial_data():
    from models import Admin, ServiceCategory
    import bcrypt

    if not Admin.query.filter_by(username='admin').first():
        hashed = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
        admin = Admin(
            username='admin',
            email='admin@grampanchayat.gov.in',
            password_hash=hashed,
            full_name='System Administrator',
            role='admin',
            department='General Administration'
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Default admin created  →  username: admin  |  password: Admin@123")

    if ServiceCategory.query.count() == 0:
        services = [
            dict(name_en='Birth Certificate',        name_hi='जन्म प्रमाण पत्र',      name_mr='जन्म दाखला',
                 description='Official birth registration certificate for newborns',
                 icon='👶', fee=50.00,   processing_days=7,
                 required_docs='Hospital birth slip, Parents Aadhar card, Residence proof'),
            dict(name_en='Death Certificate',        name_hi='मृत्यु प्रमाण पत्र',    name_mr='मृत्यू दाखला',
                 description='Official death registration certificate',
                 icon='📜', fee=50.00,   processing_days=7,
                 required_docs='Hospital death cert, Deceased Aadhar, Family Aadhar card'),
            dict(name_en='Income Certificate',       name_hi='आय प्रमाण पत्र',        name_mr='उत्पन्नाचा दाखला',
                 description='Certificate declaring annual family income',
                 icon='💰', fee=30.00,   processing_days=10,
                 required_docs='Ration card, Salary slip or self-declaration, Aadhar card'),
            dict(name_en='Caste Certificate',        name_hi='जाति प्रमाण पत्र',      name_mr='जात प्रमाणपत्र',
                 description='Certificate for SC/ST/OBC/NT caste verification',
                 icon='🏅', fee=30.00,   processing_days=15,
                 required_docs='Previous caste cert or school leaving cert, Aadhar, Ration card'),
            dict(name_en='Domicile Certificate',     name_hi='अधिवास प्रमाण पत्र',    name_mr='रहिवास दाखला',
                 description='Proof of permanent residence in the state',
                 icon='🏠', fee=40.00,   processing_days=12,
                 required_docs='Aadhar card, Voter ID, Electricity bill or rent agreement'),
            dict(name_en='Marriage Certificate',     name_hi='विवाह प्रमाण पत्र',     name_mr='विवाह नोंदणी दाखला',
                 description='Official marriage registration certificate',
                 icon='💑', fee=100.00,  processing_days=7,
                 required_docs='Marriage photo, Bride & Groom Aadhar, Age proof, 2 witnesses ID'),
            dict(name_en='No Objection Certificate', name_hi='अनापत्ति प्रमाण पत्र',  name_mr='ना-हरकत दाखला',
                 description='NOC for various administrative purposes',
                 icon='✅', fee=25.00,   processing_days=5,
                 required_docs='Application form, Aadhar card, Purpose documentation'),
            dict(name_en='Water Connection',         name_hi='पानी कनेक्शन',          name_mr='पाणी जोडणी',
                 description='New water supply connection for residential / commercial property',
                 icon='💧', fee=500.00,  processing_days=30,
                 required_docs='Property documents, Aadhar card, Site plan, No dues certificate'),
            dict(name_en='Building Permission',      name_hi='भवन अनुमति',             name_mr='बांधकाम परवानगी',
                 description='Permission for new construction or renovation',
                 icon='🏗️', fee=1000.00, processing_days=45,
                 required_docs='Land documents, Building plan, Site clearance, NOC from neighbours'),
            dict(name_en='Trade License',            name_hi='व्यापार लाइसेंस',       name_mr='व्यापार परवाना',
                 description='License for starting a new business or shop',
                 icon='🏪', fee=200.00,  processing_days=20,
                 required_docs='Business address proof, Owner Aadhar, Shop photos, Fire NOC'),
        ]
        for s in services:
            db.session.add(ServiceCategory(**s))
        db.session.commit()
        print("✅ 10 service categories seeded")


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
