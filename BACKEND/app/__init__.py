from flask import Flask, send_from_directory, request,abort, jsonify
from flask_cors import CORS
from app.config import Config
from app.models.database import db
from app.utils.request_logger import log_request
from app.jobs.payment_reminder import start_scheduler
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import Flask
from flask_mail import Mail
from app.config import Config
from flask_jwt_extended import JWTManager
from datetime import timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity, JWTManager

import logging
from logging.handlers import RotatingFileHandler
import os
mail=Mail()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour", "50 per minute"]
)
from flask_talisman import Talisman
mail = Mail()
jwt = JWTManager()
def create_app():
    app = Flask(__name__)
    limiter.init_app(app)
    app.config.from_object(Config)
    app.config["JWT_SECRET_KEY"] = "ap_rera_secret_key"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=9)

    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    app.config["JWT_HEADER_NAME"] = "Authorization"

    app.config["JWT_HEADER_TYPE"] = "Bearer"
    mail.init_app(app)
    
# ---------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

log_file = os.path.join(LOG_DIR, "app.log")

handler = RotatingFileHandler(
    log_file,
    maxBytes=5_000_000,
    backupCount=5
)

formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(handler)
root_logger.addHandler(logging.StreamHandler())

# reduce flask request noise
logging.getLogger("werkzeug").setLevel(logging.WARNING)


# ---------------------------------------------------------
# Create Flask App
# ---------------------------------------------------------

def create_app():

    app = Flask(__name__)
    limiter.init_app(app)
    app.config.from_object(Config)
    app.config.update(
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Strict",
    )

    # mail.init_app(app)

    csp = {
        "default-src": "'self'",
        "script-src": [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'"
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'"
        ],
        "img-src": [
            "'self'",
            "data:"
        ]
    }

    Talisman(
        app,
        content_security_policy=csp,
        force_https=True,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        frame_options="DENY",
        x_content_type_options="nosniff",
        referrer_policy="strict-origin-when-cross-origin"
    )

    app.config["JWT_SECRET_KEY"] = "ap_rera_secret_key"
    jwt = JWTManager(app)

    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    app.config["JWT_HEADER_NAME"] = "Authorization"

    app.config["JWT_HEADER_TYPE"] = "Bearer"

    jwt.init_app(app)

    start_scheduler(app)

    # ---------------------------------------------------------
    # MAIL CONFIGURATION
    # ---------------------------------------------------------

    app.config["MAIL_SERVER"] = os.getenv("SMTP_HOST")
    app.config["MAIL_PORT"] = int(os.getenv("SMTP_PORT"))
    app.config["MAIL_USE_TLS"] = os.getenv("SMTP_USE_TLS") == "true"
    app.config["MAIL_USE_SSL"] = os.getenv("SMTP_USE_SSL") == "true"
    app.config["MAIL_USERNAME"] = os.getenv("SMTP_USER")
    app.config["MAIL_PASSWORD"] = os.getenv("SMTP_PASSWORD")
    app.config["MAIL_DEFAULT_SENDER"] = os.getenv("FROM_EMAIL")



    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    UPLOAD_FOLDER = os.path.abspath(
    os.path.join(BASE_DIR, "..", "uploads")
)

    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    # ---------------------------------------------------------
    # CORS Configuration
    # ---------------------------------------------------------

    allowed_origins = [
    origin.strip()
    for origin in app.config["ALLOWED_ORIGINS"].split(",")
    ]

    CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {"origins": allowed_origins},
        r"/uploads/*": {"origins": allowed_origins}
    },
   
    allow_headers=[
        "Content-Type",
        "Authorization"
    ]
)

    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            return "", 200
    @app.before_request
    def csrf_protection():

      if request.method in ["POST", "PUT", "PATCH", "DELETE"]:

        origin = request.headers.get("Origin")

        allowed_origins = [
            origin.strip()
            for origin in app.config["ALLOWED_ORIGINS"].split(",")
        ]

        if origin and origin not in allowed_origins:
            abort(403, description="Invalid Origin")


    # ---------------------------------------------------------
    # Database Initialization
    # ---------------------------------------------------------

    db.init_app(app)
    limiter.init_app(app)

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "success": False,
            "message": "Maximum 3 OTP requests allowed in 15 minutes. Please try again after 15 minutes."
        }), 429

    # ---------------------------------------------------------
    # GLOBAL API AUDIT LOGGER (MIDDLEWARE)
    # ---------------------------------------------------------

    # app.after_request(log_request)

    # ---------------------------------------------------------
    # Serve Uploaded Files
    # ---------------------------------------------------------

    @app.route("/uploads/<path:filename>")
    @jwt_required()
    def serve_uploaded_file(filename):

        print("🔥 FILE ROUTE HIT")
        print("🔥 Requested filename:", filename)

        project_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..")
        )

        uploads_folder = os.path.join(project_root, "uploads")

        legacy_upload_folder = os.path.abspath(
            os.path.join(BASE_DIR, "..", "backend", "uploads")
        )

        print("🔥 Uploads Folder:", uploads_folder)

        full_path = os.path.join(uploads_folder, filename)

        print("🔥 Full Path:", full_path)

        print("🔥 Exists:", os.path.exists(full_path))

        # Check current uploads folder
        if os.path.exists(os.path.join(uploads_folder, filename)):
            print("✅ FILE FOUND IN CURRENT UPLOADS")
            return send_from_directory(uploads_folder, filename)

        # Check legacy uploads folder
        if os.path.exists(os.path.join(legacy_upload_folder, filename)):
            print("✅ FILE FOUND IN LEGACY UPLOADS")
            return send_from_directory(legacy_upload_folder, filename)

        print("❌ FILE NOT FOUND")

        return {
            "error": "File not found",
            "path": full_path
        }, 404
    

    # ---------------------------------------------------------
    # Register Blueprints
    # ---------------------------------------------------------

    from app.controllers.test_connection_controller import test_connection_bp
    from app.controllers.location_controller import location_bp
    from app.controllers.development_details_controller import development_details_bp
    from app.controllers.project_registration_controller import project_registration_bp
    from app.controllers.project_wizard_controller import project_wizard_bp
    from app.controllers.complint_controller import complint_bp
    from app.controllers.promoter_registration_controller import promoter_registration_bp
    from app.controllers.project_uploddocuments_controller import project_upload_documents_bp
    from app.controllers.occupation_controller import occupation_controller
    from app.controllers.agent_registration_controller import agent_bp
    from app.controllers.otp_controller import otp_bp
    from app.controllers.associate_controller import associate_bp
    from app.controllers.application_associate_controller import application_associate_bp
    from app.controllers.project_preview_controller import preview_bp
    from app.controllers.projectapplicationdetailsextension import projectapplicationdetailsextension_bp
    from app.controllers.login_controller import login_bp
    from app.controllers.agent_other_than_individual_registration_controller import agent_other_than_individual_registration_bp
    from app.controllers.othertheninduvidual_project_registration_controller import othertheninduvidual_project_registration_bp
    from app.controllers.othertheninduvidual_project_preview_controller import othertheninduvidual_project_preview_bp

    # other modules
    from app.controllers.rera_other_t_indv_controller import rera_other_t_indv_bp
    from app.controllers.past_project_other_t_indv_controller import past_project_other_t_indv_bp
    from app.controllers.litigation_other_t_indv_controller import litigation_other_t_indv_bp
    from app.controllers.promoter2_other_t_indv_controller import promoter2_other_t_indv_bp
    from app.controllers.files_other_t_indv_controller import files_other_t_indv_bp
    from app.controllers.promoter_other_t_indv_controller import promoter_other_t_indv_bp
    from app.controllers.org_member_other_t_indv_controller import org_member_other_t_indv_bp

    from app.controllers.quarterly_controller import quarterly_bp
    from app.controllers.project_quarterly_plot_controller import project_quarterly_plot_bp
    from app.controllers.change_request_controller import change_request_bp

    from app.controllers.project_closure_controller import project_closure_bp

    from app.controllers.agent_renewal_controller import agent_renewal_bp
    from app.controllers.admin_requests_controller import admin_requests_bp
    from app.controllers.admin_requests_controller2 import admin_renewal_bp
    from app.controllers.admin_controller import admin_bp
    from app.controllers.agent_change_request_controller import agent_change_request_bp
    from app.controllers.scrutiny_projectregistation_controller import scrutiny_bp
    from app.controllers.chat_controller import chat_bp
    from app.controllers.faq_controller import faq_bp
    from app.controllers.verification_controller import verification_bp
    from app.controllers.project_unregistered_controller import project_unregistered_bp
    from app.controllers.project_exemption_controller import project_exemption_bp
    from app.controllers.agent_scrutiny_controller import agent_scrutiny_bp
    from app.controllers.rti_controller import rti_bp

    # Added from second file
    from app.controllers.search_controller import search_bp
    from app.controllers.project_rating_controller import project_rating_bp
    from app.controllers.project_gallery_controller import project_gallery_bp
    from app.controllers.project_extention_controller import project_extention_bp

    # Added from second file


    app.register_blueprint(change_request_bp, url_prefix="/api")
    app.register_blueprint(quarterly_bp, url_prefix="/api")

    app.register_blueprint(promoter_other_t_indv_bp)
    app.register_blueprint(org_member_other_t_indv_bp)
    app.register_blueprint(rera_other_t_indv_bp)
    app.register_blueprint(past_project_other_t_indv_bp)
    app.register_blueprint(litigation_other_t_indv_bp)
    app.register_blueprint(promoter2_other_t_indv_bp)
    app.register_blueprint(files_other_t_indv_bp)

    app.register_blueprint(agent_other_than_individual_registration_bp, url_prefix="/api")
    app.register_blueprint(preview_bp, url_prefix="/api")
    app.register_blueprint(application_associate_bp, url_prefix="/api")
    app.register_blueprint(associate_bp, url_prefix="/api")
    app.register_blueprint(project_upload_documents_bp, url_prefix="/api")
    app.register_blueprint(project_wizard_bp, url_prefix="/api")
    app.register_blueprint(promoter_registration_bp, url_prefix="/api")
    app.register_blueprint(complint_bp, url_prefix="/api")
    app.register_blueprint(development_details_bp, url_prefix="/api")
    app.register_blueprint(test_connection_bp, url_prefix="/api")
    app.register_blueprint(location_bp, url_prefix="/api")
    app.register_blueprint(project_registration_bp, url_prefix="/api")
    app.register_blueprint(occupation_controller, url_prefix="/api")

    app.register_blueprint(agent_bp, url_prefix="/api/agent")
    app.register_blueprint(otp_bp, url_prefix="/api/otp")

    print("\n========== REGISTERED ROUTES ==========")
    for rule in app.url_map.iter_rules():
      print(rule)
    print("=======================================\n")

    app.register_blueprint(projectapplicationdetailsextension_bp, url_prefix="/api")
    app.register_blueprint(login_bp, url_prefix="/api")
    app.register_blueprint(othertheninduvidual_project_registration_bp, url_prefix="/api")

    app.register_blueprint(othertheninduvidual_project_preview_bp, url_prefix="/api")

    app.register_blueprint(project_quarterly_plot_bp)

    app.register_blueprint(project_closure_bp, url_prefix="/api/project_closure")

    app.register_blueprint(agent_renewal_bp, url_prefix="/api/agent-renewal")
    app.register_blueprint(admin_renewal_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api")
    app.register_blueprint(agent_change_request_bp, url_prefix="/api")
    app.register_blueprint(scrutiny_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(faq_bp, url_prefix="/api")
    app.register_blueprint(verification_bp, url_prefix="/api")
    app.register_blueprint(project_unregistered_bp, url_prefix="/api")
    app.register_blueprint(project_exemption_bp, url_prefix="/api")
    app.register_blueprint(agent_scrutiny_bp)
    app.register_blueprint(rti_bp, url_prefix="/api")

    # Added from second file
    app.register_blueprint(search_bp, url_prefix="/api")
    app.register_blueprint(project_rating_bp, url_prefix="/api")
    app.register_blueprint(project_gallery_bp, url_prefix="/api")
    app.register_blueprint(project_extention_bp, url_prefix="/api")
    
    @app.route("/auth/me", methods=["GET"])
    @jwt_required()
    def auth_me():
        return jsonify({
            "authenticated": True
    }), 200

    return app