from flask import Blueprint, request, jsonify, send_from_directory
from app.models.database import db
from app.models.agent_other_than_individual_registration_organisation_model import (
    AgentOtherThanIndividualOrganisation,
)
from app.models.agent_other_than_individual_registration_entity_model import (
    AgentOtherThanIndividualEntity,
)
from app.models.agent_other_than_individual_registration_authorized_model import (
    AgentOtherThanIndividualAuthorized,
)
from app.models.agent_other_than_individual_registration_litigation_model import (
    AgentOtherThanIndividualLitigation,
)
from app.utils.validation_schemas import validate_registration
import os
import json
import logging
from werkzeug.utils import secure_filename
from datetime import datetime 
from app.utils.encryption import encrypt_value, decrypt_value


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "agent_doc")
LOG_FILE = os.path.join(BASE_DIR, "logs", "agent_registration.log")

os.makedirs(UPLOAD_DIR, exist_ok=True)

logger = logging.getLogger("agent_registration")
logger.setLevel(logging.INFO)

if not logger.handlers:
    fh = logging.FileHandler(LOG_FILE)
    fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(fh)

agent_other_than_individual_registration_bp = Blueprint(
    "agent_other_than_individual_registration_bp", __name__
)


def save_file(file_obj, prefix):
    if not file_obj:
        return None
    filename = secure_filename(file_obj.filename)
    final_name = f"{prefix}_{filename}"
    file_obj.save(os.path.join(UPLOAD_DIR, final_name))
    return f"agent_doc/{final_name}"


def generate_application_no():
    return datetime.now().strftime("%Y%m%d%H%M%S")


# ==========================================================
# REGISTER AGENT
# ==========================================================


@agent_other_than_individual_registration_bp.route(
    "/agent/other-than-individual", methods=["POST"]
)
def register_agent():
    try:
        form = request.form
        files = request.files
        
        # ✅ FIX: Get PAN from form
        pan_card_number = form.get("pan_card_number")
        
        print("========== REGISTER API ==========")
        print("PAN from frontend:", pan_card_number)

        validation_error = validate_registration({
            "pan": pan_card_number
        })

        if validation_error:
            print("Validation Failed")
            return validation_error

        print("Validation Success")
        application_no = generate_application_no()

        affidavit_value = form.get("self_declared_affidavit")

        if affidavit_value in (None, "", "null"):
            affidavit_value = None
        else:
            try:
                affidavit_value = json.loads(affidavit_value)
            except Exception:
                affidavit_value = None

        # ================= MASTER TABLE =================

        agent = AgentOtherThanIndividualOrganisation(
            agent_type="Other Than Individual",
            application_no=application_no,
            agent_name=form.get("organisation_name"),
            father_name="NA",
            occupation_id=None,
            email=encrypt_value(form.get("email_id")),
            aadhaar=None,
            pan=encrypt_value(form.get("pan_card_number")),
            mobile=encrypt_value(form.get("mobile_number")),
            landline=form.get("landline_number"),
            license_number=None,
            license_date=None,
            address1=form.get("address_line1"),
            address2=form.get("address_line2"),
            state_id=form.get("state"),
            district=form.get("district"),
            mandal=form.get("mandal"),
            village=form.get("village"),
            pincode=form.get("pincode"),
            photograph={},
            pan_proof={"file": save_file(files.get("pan_card_doc"), "org_pan")},
            address_proof={
                "file": save_file(files.get("address_proof_doc"), "address_proof")
            },
            self_declared_affidavit=affidavit_value,
           
            any_civil_criminal_cases=None,
            registration_other_states=json.dumps(
                json.loads(form.get("other_state_rera_details", "[]"))
            ),
            declaration=True,
            organisation_type=form.get("organisation_type"),
            registration_identifier=form.get("registration_number"),
            registration_date=form.get("registration_date"),
            registration_cert_doc=save_file(
                files.get("registration_cert_doc"), "registration_cert"
            ),
            gst_number=form.get("gst_number"),
            gst_doc=save_file(files.get("gst_doc"), "gst"),
            legal_document=save_file(
                files.get("memorandum_doc") or files.get("partnership_deed"),
                "legal_document",
            ),
            last_five_years_projects_details=json.loads(
                form.get("last_five_year_projects", "[]")
            ),
        )

        db.session.add(agent)
        db.session.flush()
        agent_id = agent.id

        # ================= ENTITIES =================

        entities_data = json.loads(form.get("entities", "[]"))

        for index, e in enumerate(entities_data):
            validation_error = validate_registration({
                "pan": e.get("pan"),
                "aadhaar": e.get("aadhaar"),
                "mobile": e.get("mobile")
            })
            
            if validation_error:
                return validation_error
            
            entity = AgentOtherThanIndividualEntity(
                designation=e.get("designation"),
                name=e.get("name"),
                email_id=encrypt_value(e.get("email")),
                mobile_number=encrypt_value(e.get("mobile")),
                state_ut=e.get("state"),
                district=e.get("district"),
                address_line1=e.get("address1"),
                address_line2=e.get("address2"),
                pincode=e.get("pincode"),
                pan_card_number=encrypt_value(e.get("pan")),
                aadhaar_number=encrypt_value(e.get("aadhaar")),
                entity_type=e.get("nationality"),
                din_number=e.get("din"),
                photograph=save_file(
                    files.get(f"entity_photo_{index}"), f"entity_photo_{index}"
                ),
                aadhaar_doc=save_file(
                    files.get(f"entity_aadhaar_doc_{index}"), f"entity_aadhaar_{index}"
                ),
                pan_card_doc=save_file(
                    files.get(f"entity_pan_doc_{index}"), f"entity_pan_{index}"
                ),
                address_proof=save_file(
                    files.get(f"entity_address_proof_{index}"),
                    f"entity_address_{index}",
                ),
                organisation_id=agent_id,
            )
            db.session.add(entity)

        # ================= AUTHORIZED =================

        authorized_data = json.loads(form.get("authorized_persons", "[]"))

        for index, a in enumerate(authorized_data):
            authorized = AgentOtherThanIndividualAuthorized(
                name=a.get("name"),
                email_id=encrypt_value(a.get("email")),
                mobile_number=encrypt_value(a.get("mobile")),
                photo=save_file(
                    files.get(f"authorized_photo_{index}"), f"authorized_photo_{index}"
                ),
                board_resolution=save_file(
                    files.get(f"board_resolution_{index}"), f"board_resolution_{index}"
                ),
                organisation_id=agent_id,
            )
            db.session.add(authorized)

        # ================= LITIGATIONS =================

        litigations_data = json.loads(form.get("litigations", "[]"))

        if litigations_data:
            for index, l in enumerate(litigations_data):
                litigation = AgentOtherThanIndividualLitigation(
                    case_no=l.get("case_no"),
                    tribunal_place=l.get("tribunal_name_place"),
                    petitioner_name=l.get("petitioner_name"),
                    respondent_name=l.get("respondent_name"),
                    case_facts=l.get("case_facts"),
                    present_status=l.get("present_status"),
                    interim_order_certificate={
                        "file": save_file(
                            files.get(f"interim_certificate_{index}"),
                            f"interim_{index}"
                        )
                    },
                    disposed_certificate={
                        "file": save_file(
                            files.get(f"final_certificate_{index}"), f"final_{index}"
                        )
                    },
                    self_declared_affidavit=None,
                    agent_id=agent_id,
                )
                db.session.add(litigation)
        else:
            affidavit_file = save_file(files.get("self_affidavit"), "self_affidavit")
            litigation = AgentOtherThanIndividualLitigation(
                self_declared_affidavit=affidavit_file,
                agent_id=agent_id,
            )
            db.session.add(litigation)

        db.session.commit()

        return (
            jsonify(
                {
                    "status": "success",
                    "agent_id": agent_id,
                    "application_no": application_no,
                    "pan": agent.pan,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        logger.error("REGISTER ERROR", exc_info=True)
        return jsonify({"status": "error", "message": "Internal server error"}), 500


# ==========================================================
# GET DETAILS
# ==========================================================


@agent_other_than_individual_registration_bp.route(
    "/agent/other-than-individual/details", methods=["GET"]
)
def get_agent_other_than_individual_details():

    organisation_id = request.args.get("organisation_id")

    if not organisation_id:
        return jsonify({"status": "error", "message": "organisation_id required"}), 400

    organisation = AgentOtherThanIndividualOrganisation.query.filter_by(
        id=organisation_id
    ).first()
    
    print("Organisation Found:", organisation)

    if organisation:
        print("Encrypted PAN in DB:", organisation.pan)

    if not organisation:
        return jsonify({"status": "error", "message": "Not found"}), 404

    entities = AgentOtherThanIndividualEntity.query.filter_by(
        organisation_id=organisation_id
    ).all()

    authorized = AgentOtherThanIndividualAuthorized.query.filter_by(
        organisation_id=organisation_id
    ).all()

    litigations = AgentOtherThanIndividualLitigation.query.filter_by(
        agent_id=organisation_id
    ).all()

    return (
        jsonify(
            {
                "status": "success",
                "organisation": organisation.to_dict(),
                "entities": [e.to_dict() for e in entities],
                "authorized": [a.to_dict() for a in authorized],
                "litigations": [l.to_dict() for l in litigations],
            }
        ),
        200,
    )


# ==========================================================
# SERVE FILES
# ==========================================================


@agent_other_than_individual_registration_bp.route(
    "/agent_doc/<path:filename>", methods=["GET"]
)
def serve_agent_files(filename):
    return send_from_directory(UPLOAD_DIR, filename)


# ==========================================================
# ✅ FIXED: UPDATE ITR DOCUMENTS - COMPLETE WORKING CODE
# ==========================================================

@agent_other_than_individual_registration_bp.route(
    "/agent/other-than-individual/itr", methods=["PATCH"]
)
def update_agent_itr_documents():
    try:
        form = request.form
        files = request.files

        organisation_id = form.get("id")
        pan_card_number = form.get("pan_card_number")

        print("========== PATCH API ==========")
        print("Form Data :", form.to_dict())
        print("Files :", list(files.keys()))
        print("Organisation ID:", organisation_id)
        print("PAN from frontend:", pan_card_number)

        # Validation
        if not organisation_id or not pan_card_number:
            return (
                jsonify({
                    "status": "error",
                    "message": "id and pan_card_number are required",
                }),
                400,
            )

        # Fetch organisation
        organisation = AgentOtherThanIndividualOrganisation.query.filter_by(
            id=organisation_id
        ).first()

        if not organisation:
            return (
                jsonify({
                    "status": "error",
                    "message": "Organisation not found"
                }),
                404,
            )

        # 🔥 FIX: Compare encrypted PAN with encrypted PAN (no decryption)
        db_pan_encrypted = organisation.pan
        request_pan_encrypted = pan_card_number

        logger.info(f"Comparing PANs - DB: {db_pan_encrypted[:30]}... Request: {request_pan_encrypted[:30]}...")

        if db_pan_encrypted.strip() != request_pan_encrypted.strip():
            logger.error(f"PAN mismatch")
            return (
                jsonify({
                    "status": "error",
                    "message": "Invalid PAN number"
                }),
                400,
            )

        # ✅ Update ITR files
        itr_updated = False

        if files.get("itr_year1"):
            organisation.itr_year1 = {
                "file": save_file(files.get("itr_year1"), "itr1")
            }
            itr_updated = True
            logger.info(f"Updated ITR Year 1: {organisation.itr_year1}")

        if files.get("itr_year2"):
            organisation.itr_year2 = {
                "file": save_file(files.get("itr_year2"), "itr2")
            }
            itr_updated = True
            logger.info(f"Updated ITR Year 2: {organisation.itr_year2}")

        if files.get("itr_year3"):
            organisation.itr_year3 = {
                "file": save_file(files.get("itr_year3"), "itr3")
            }
            itr_updated = True
            logger.info(f"Updated ITR Year 3: {organisation.itr_year3}")

        if not itr_updated:
            return (
                jsonify({
                    "status": "error",
                    "message": "At least one ITR file is required"
                }),
                400,
            )

        db.session.commit()

        return (
            jsonify({
                "status": "success",
                "message": "ITR documents updated successfully",
                "itr_documents": {
                    "itr_year1": organisation.itr_year1,
                    "itr_year2": organisation.itr_year2,
                    "itr_year3": organisation.itr_year3,
                },
            }),
            200,
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"ITR PATCH ERROR: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


@agent_other_than_individual_registration_bp.route(
    "/check-application/<application_no>", methods=["GET"]
)
def check_application(application_no):
    try:
        exists = AgentOtherThanIndividualOrganisation.is_application_exists(
            application_no
        )

        return jsonify({"exists": exists}), 200

    except Exception as e:
        return jsonify({"exists": False, "error": "Internal server error"}), 500