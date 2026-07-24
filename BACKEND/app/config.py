import os
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from datetime import timedelta
from flask_cors import CORS

# Load environment variables from .env
load_dotenv()

# ========================
# Base Directory
# ========================
# Points to: BACKEND/
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


# ========================
# Helpers
# ========================
def str_to_bool(value, default=False):
    if value is None:
        return default
    return value.lower() in ("true", "1", "yes")


# ========================
# Config Class
# ========================
class Config:
    # Flask App
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    if not SECRET_KEY:
        raise RuntimeError("❌ SECRET_KEY is not set in .env")

    DEBUG = str_to_bool(os.getenv("FLASK_DEBUG"), False)
    PORT = int(os.getenv("PORT", 8080))
    
    # ========================
# JWT Configuration
# ========================
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

# If using cookies (recommended)
    JWT_TOKEN_LOCATION = ["cookies"]

    JWT_COOKIE_SECURE = False  # True in production HTTPS

    JWT_COOKIE_HTTPONLY = True

    JWT_COOKIE_SAMESITE = "Strict"

    JWT_COOKIE_CSRF_PROTECT = False  # Enable later if needed

    # ========================
    # ========================
    # CORS
    # ========================
    # Comma-separated string (safe for flask-cors)
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5174,"
        "http://127.0.0.1:5174,"
        "https://k0mqkt9g-8081.inc1.devtunnels.ms/"
    )
    # https://0jv8810n-5173.inc1.devtunnels.ms/

    # ========================
    # Database
    # ========================
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("❌ DATABASE_URL is not set in .env")

    # ========================
    # Email
    # ========================
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

    SMTP_USE_TLS = str_to_bool(os.getenv("SMTP_USE_TLS"), True)
    SMTP_USE_SSL = str_to_bool(os.getenv("SMTP_USE_SSL"), False)

    FROM_EMAIL = os.getenv("FROM_EMAIL")

    if not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError("SMTP credentials are not configured")

    # ========================
    # Public URL
    # ========================
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL")
    # JWT Configuration
    # ========================

    JWT_SECRET_KEY = "ap_rera_secret_key"

    JWT_TOKEN_LOCATION = ["cookies"]

    JWT_COOKIE_SECURE = True

    JWT_COOKIE_CSRF_PROTECT = False

    JWT_ACCESS_COOKIE_NAME = "access_token"

    # ========================
    # File Uploads
    # ========================
    UPLOAD_FOLDER = os.path.join(
        BASE_DIR, "app", "uploads", "complint_doc"
    )

  


# ========================
# Ensure upload folder exists
# ========================
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
