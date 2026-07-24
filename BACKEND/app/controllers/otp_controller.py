from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random
from flask_jwt_extended import create_access_token
from sqlalchemy import text

from app.utils.mail_service import send_email_otp as send_email_otp_message
from app.models.database import db
from app.models.agent_model import Agent
from app.models.agent_registration_model import AgentModel
from app.models.otp_model import AgentOTP
from app.utils.encryption import encrypt_value, decrypt_value

print("✅ OTP CONTROLLER LOADED")

otp_bp = Blueprint("otp_bp", __name__)


# =================================================
# SEND EMAIL OTP
# =================================================
@otp_bp.route("/send-email", methods=["POST"])
def send_email_otp():
    try:
        data = request.json
        pan = data.get("panNumber")

        if not pan:
            return jsonify({"error": "PAN number required"}), 400

        # Read all encrypted PANs
        rows = db.session.execute(
            text("""
                SELECT id, pan, email
                FROM agentregistration_details_t
            """)
        ).fetchall()

        row = None

        # Find matching PAN after decrypting
        for r in rows:
            try:
                decrypted_pan = decrypt_value(r.pan)

                print("==========================")
                print("DB PAN    :", decrypted_pan)
                print("INPUT PAN :", pan)
                print("MATCH     :", decrypted_pan.upper() == pan.upper())

                if decrypted_pan.upper().strip() == pan.upper().strip():
                    print("✅ MATCH FOUND")
                    row = r
                    break

            except Exception as ex:
                print("Decrypt Error:", ex)

        if row is None:
            return jsonify({"error": "PAN not registered"}), 404

        agent_id = row.id

        print("Encrypted Email:", row.email)

        email = decrypt_value(row.email)

        print("Decrypted Email:", email)

        if not email:
            return jsonify({"error": "Email not available"}), 400

        # Generate OTP
        otp = str(random.randint(100000, 999999))

        # Delete old OTP
        db.session.execute(
            text("DELETE FROM agent_otp_t WHERE agent_id = :id"),
            {"id": agent_id}
        )

        # Insert new OTP
        db.session.execute(
            text("""
                INSERT INTO agent_otp_t
                (agent_id, otp, created_at)
                VALUES
                (:agent_id, :otp, NOW())
            """),
            {
                "agent_id": agent_id,
                "otp": otp
            }
        )

        db.session.commit()

        send_email_otp_message(email, otp)

        return jsonify({
            "success": True,
            "message": "OTP sent to registered email"
        }), 200

    except Exception as e:
        db.session.rollback()

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =================================================
# VERIFY OTP - FIXED
# =================================================
@otp_bp.route("/verify", methods=["POST"])
def verify_otp():
    try:
        data = request.json
        pan = data.get("panNumber")
        otp = data.get("otp")

        if not pan or not otp:
            return jsonify({
                "success": False,
                "error": "PAN and OTP are required"
            }), 400

        # Read all encrypted PANs
        rows = db.session.execute(text("""
            SELECT id, pan
            FROM agentregistration_details_t
        """)).fetchall()

        row = None

        # Find matching PAN after decrypting
        for r in rows:
            try:
                decrypted_pan = decrypt_value(r.pan)

                print("==========================")
                print("VERIFY DB PAN :", decrypted_pan)
                print("INPUT PAN     :", pan)

                if decrypted_pan.upper().strip() == pan.upper().strip():
                    print("✅ VERIFY PAN MATCH FOUND")
                    row = r
                    break

            except Exception as ex:
                print("Decrypt Error:", ex)

        if row is None:
            return jsonify({
                "success": False,
                "error": "PAN not registered"
            }), 404

        agent_id = row.id

        print("================================")
        print("Agent ID:", agent_id)
        print("Entered OTP:", otp)

        # Check OTP in database
        otp_rows = db.session.execute(
            text("""
                SELECT id, otp, created_at
                FROM agent_otp_t
                WHERE agent_id = :agent_id
                ORDER BY created_at DESC
            """),
            {"agent_id": agent_id}
        ).fetchall()

        for r in otp_rows:
            print("DB OTP:", r.otp)
            print("Created:", r.created_at)

        print("================================")

        # Validate OTP
        otp_row = db.session.execute(
            text("""
                SELECT id
                FROM agent_otp_t
                WHERE agent_id = :agent_id
                  AND otp = :otp
                  AND created_at >= NOW() - INTERVAL '5 minutes'
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {
                "agent_id": agent_id,
                "otp": otp
            }
        ).fetchone()

        if not otp_row:
            return jsonify({
                "success": False,
                "error": "Invalid or expired OTP"
            }), 401

        # Mark verified
        db.session.execute(
            text("""
                UPDATE agent_otp_t
                SET is_verified = TRUE
                WHERE id = :id
            """),
            {"id": otp_row.id}
        )

        db.session.commit()

        # ✅ Generate access token - FIXED INDENTATION
        access_token = create_access_token(
           identity=str(agent_id),
           additional_claims={
             "pan": pan
      }
    )

        return jsonify({
            "success": True,
            "message": "OTP verified successfully",
            "token": access_token,
            "agent_id": agent_id,
            "pan": pan
        }), 200

    except Exception as e:
        db.session.rollback()

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500