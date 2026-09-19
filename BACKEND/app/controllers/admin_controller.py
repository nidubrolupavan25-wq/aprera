import traceback
import hashlib
import hmac
import random
import secrets
import string
import os
from datetime import datetime, timedelta
from flask import Blueprint, current_app, request,jsonify
from app.models.database import db
from app.utils.mail_utils import send_otp_email
from app.models.admin_model import Admin
from app import limiter
from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename
from flask_jwt_extended import get_jwt_identity
from app.utils.encryption import (
    encrypt_value,
    decrypt_value,
    decrypt_if_encrypted
)

from app.utils.mail_service import (
    send_admin_credentials_email
)
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)




admin_bp = Blueprint("admin_bp", __name__)

SECRET_KEY = "aprera_secret_key"


def generate_username():

    while True:

        username = (
            "APRERA" +
            str(
                secrets.randbelow(
                    999999
                )
            ).zfill(6)
        )

        exists = Admin.query.filter_by(
            username=username
        ).first()

        if not exists:
            return username
        
def generate_password():
    chars = (
        string.ascii_letters +
        string.digits +
        "@#$"
    )

    return "".join(
        secrets.choice(chars)
        for _ in range(12)
    )


def hash_otp(otp):
    return hmac.new(
        SECRET_KEY.encode(),
        str(otp).encode(),
        hashlib.sha256
    ).hexdigest()

def admin_response(admin):
    return {
        "id": admin.id,
        "username": admin.username,
        "full_name": admin.full_name,
        "email": decrypt_if_encrypted(admin.email),
        "phone": decrypt_if_encrypted(admin.phone),
        "role": admin.role,
        "department": admin.department,
        "photo": admin.photo,
        "employee_id": admin.employee_id,
        "state": admin.state,
        "district": admin.district,
        "mandal": admin.mandal,
        "village": admin.village,
        "pincode": admin.pincode,
    }
   
@admin_bp.route("/admin/create", methods=["POST"])
@jwt_required()
def create_admin():
    print("================================")
    print("CREATE API HIT")
    print("JWT USER:", get_jwt_identity())
    print("================================")


    try:

        full_name = request.form.get("full_name")
        first_name = request.form.get("first_name")
        last_name = request.form.get("last_name")
        email = request.form.get("email")
        phone = request.form.get("phone")
        department = request.form.get("department")
        role = request.form.get("role")
        employee_id = request.form.get("employee_id")

        if not email:
            return jsonify({
                "error": "Email required"
            }), 400

        if not phone:
            return jsonify({
                "error": "Phone required"
            }), 400

        username = generate_username()

        plain_password = generate_password()

        hashed_password = generate_password_hash(
            plain_password
        )

        encrypted_email = encrypt_value(email)

        encrypted_phone = encrypt_value(phone)

        photo_path = None

        image = request.files.get("photo")

        if image:

            upload_folder = os.path.join(
                os.getcwd(),
                "uploads",
                "authority_images"
            )

            os.makedirs(
                upload_folder,
                exist_ok=True
            )

            filename = (
                f"{username}_"
                + secure_filename(image.filename)
            )

            file_path = os.path.join(
                upload_folder,
                filename
            )

            image.save(file_path)

            photo_path = (
                f"authority_images/{filename}"
            )

        admin = Admin(
            username=username,
            password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email=encrypted_email,
            phone=encrypted_phone,
            department=department,
            role=role,
            employee_id=employee_id,
            photo=photo_path
        )

        db.session.add(admin)

        db.session.commit()

        send_admin_credentials_email(
            email,
            username,
            plain_password
        )

        return jsonify({
            "message": "Admin Created Successfully",
            "username": username
        }), 201

    except Exception as e:

        db.session.rollback()

        print(str(e))

        return jsonify({
            "error": str(e)
        }), 500
        
        
@admin_bp.route("/admin/login", methods=["POST"])
@limiter.limit(
    "10 per hour",
    key_func=lambda: (
        request.get_json(silent=True) or {}
    ).get("username", request.remote_addr)
)
def admin_login():
    
    try:
        data = request.get_json()

        username = data.get("username")
        password = data.get("password")
        print("USERNAME:", username)
        print("PASSWORD:", password)

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        admin = Admin.query.filter_by(username=username).first()
        print("DB USER:", admin.username if admin else "NOT FOUND")

        if not admin:
            return jsonify({"error": "Invalid username"}), 401

        if admin.locked_until and datetime.now() < admin.locked_until:
            return jsonify({
                "error": "Account locked for 15 minutes due to 5 invalid OTP attempts"
            }), 403
            
        print("DB HASH:", admin.password)
        print("PASSWORD MATCH:", check_password_hash(admin.password, password))
        if not check_password_hash(
        admin.password,
        password
):
         return jsonify({
        "error": "Invalid password"
    }), 401
         
       
          
        print("LOGIN SUCCESS")
        otp = str(random.randint(100000, 999999))
        otp_hash = hash_otp(otp)
        otp_expiry = datetime.now() + timedelta(minutes=5)

        Admin.query.filter_by(id=admin.id).update({
            "otp_hash": otp_hash,
            "otp_expiry": otp_expiry
        })

        db.session.commit()
        db.session.refresh(admin)
       
        print("Email in DB:", admin.email)

        real_email = decrypt_if_encrypted(
    admin.email
)
        print("Final Email:", real_email)
        print("Generated OTP:", otp)
        send_otp_email(
    real_email,
    otp
)
        return jsonify({
            "message": "OTP sent to registered email",
            "username": username
        }), 200

    except Exception as e:
      db.session.rollback()

      print(e)
      return jsonify({"error": "Internal server error"}), 500

# -------------------------------
# VERIFY OTP → RETURN FULL DATA
# -------------------------------
@admin_bp.route("/admin/verify-otp", methods=["POST"])
def verify_otp():
    try:
        data = request.get_json()

        username = data.get("username")
        otp = data.get("otp")

        if not username or not otp:
            return jsonify({"error": "Username and OTP required"}), 400

        admin = Admin.query.filter_by(username=username).first()

        if not admin:
            return jsonify({"error": "Admin not found"}), 404
        
       

        if admin.locked_until and datetime.now() < admin.locked_until:
            return jsonify({
                "error": "Account locked for 15 minutes due to 5 invalid OTP attempts"
            }), 403

        if not admin.otp_hash or not admin.otp_expiry:
            return jsonify({"error": "Invalid OTP"}), 401

        if datetime.now() > admin.otp_expiry:
            return jsonify({"error": "OTP expired"}), 401
        
        print("Entered OTP :", otp)
        print("Entered Hash:", hash_otp(otp))
        print("DB Hash     :", admin.otp_hash)
        print("Match       :", hmac.compare_digest(hash_otp(otp), admin.otp_hash))

        if not hmac.compare_digest(hash_otp(otp), admin.otp_hash):

            admin.failed_otp_attempts = (
                admin.failed_otp_attempts or 0
            ) + 1

            if admin.failed_otp_attempts >= 5:
                admin.locked_until = datetime.now() + timedelta(hours=9)
                db.session.commit()
                return jsonify({
                    "error": "Account locked for 15 minutes due to 5 invalid OTP attempts"
                }), 403
            db.session.commit()

            return jsonify({"error": "Invalid OTP"}), 401

        Admin.query.filter_by(id=admin.id).update({
            "otp_hash": None,
            "otp_expiry": None,
            "failed_otp_attempts": 0,
            "locked_until": None
        })

        db.session.commit()
        db.session.refresh(admin)

#         token = create_access_token(
#     identity=str(admin.id)
# )
# Create JWT Token
        access_token = create_access_token(
    identity=str(admin.id),
    additional_claims={
        "username": admin.username,
        "role": admin.role
    }
)
        return jsonify({
    "message": "Login successful",
    "access_token": access_token,
    "admin": admin_response(admin)
}), 200

    # except Exception as e:
    #     db.session.rollback()
    #     print(e)
    #     return jsonify({"error": "Internal server error"}), 500
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        print("ERROR :", e)
        return jsonify({
            "error": str(e)
        }),500