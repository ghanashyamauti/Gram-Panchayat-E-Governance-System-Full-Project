from dotenv import load_dotenv
import os

# Explicitly load .env from the same folder as this file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
    DEBUG = os.environ.get('DEBUG', 'False') == 'True'

    DATABASE_URL = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/gram_panchayat'
    )

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}

    OTP_EXPIRY_MINUTES = 10
    OTP_LENGTH = 6
    MOCK_OTP = True

    COHERE_API_KEY = os.environ.get('COHERE_API_KEY', '')

    MOCK_PAYMENT = True

    CERTIFICATE_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'certificates')

    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')