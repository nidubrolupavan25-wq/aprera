
import base64
import json
import os
from werkzeug.utils import secure_filename

from flask import Blueprint, request, jsonify
from app.models.database import db
from app.models.agent_change_request_model import AgentRegistrationDetails, AgentChangeRequest
from app.utils.mail_service import (
    send_agent_change_request_approval_email,
    send_agent_change_request_rejection_email
)
from app.utils.validation_schemas import validate_registration
from flask_jwt_extended import jwt_required
from app.utils.encryption import encrypt_value, decrypt_value

agent_change_request_bp = Blueprint("agent_change_request_bp", __name__)

UPLOAD_FOLDER = "uploads/change_requests"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

INDIVIDUAL_REPLACEMENT_LABELS = {
    "photograph",
    "photo",
    "pan card proof",
    "pancardproof",
    "panproof",
    "address proof",
    "addressproof",
    "income tax returns acknowledgement year1",
    "income tax returns acknowledgement year 1",
    "income tax returns acknowlegement year1",
    "income tax returns acknowlegement year 1",
    "incometaxreturnsacknowledgementyear1",
    "incometaxreturnsacknowlegementyear1",
    "income tax returns acknowledgement year2",
    "income tax returns acknowledgement year 2",
    "income tax returns acknowlegement year2",
    "income tax returns acknowlegement year 2",
    "incometaxreturnsacknowledgementyear2",
    "incometaxreturnsacknowlegementyear2",
    "income tax returns acknowledgement year3",
    "income tax returns acknowledgement year 3",
    "income tax returns acknowlegement year3",
    "income tax returns acknowlegement year 3",
    "incometaxreturnsacknowledgementyear3",
    "incometaxreturnsacknowlegementyear3"
}

ORGANIZATION_REPLACEMENT_LABELS = {
    "authorized signatory photo",
    "authorizedsignatoryphoto",
    "photo",
    "authorized signature",
    "authorised signature",
    "authorizedsignature",
    "authorisedsignature",
    "authorized signatory signature",
    "authorised signatory signature",
    "authorizedsignatorysignature",
    "authorisedsignatorysignature",
    "board resolution for authorized signatory",
    "boardresolutionforauthorizedsignatory",
    "upload registration certificate",
    "upload registration card",
    "uploadregistrationcertificate",
    "uploadregistrationcard",
    "upload pan card",
    "uploadpancard",
    "upload gst",
    "upload gst certificate",
    "uploadgst",
    "uploadgstcertificate",
    "address proof",
    "addressproof",
    "income tax returns acknowledgement year1",
    "income tax returns acknowledgement year 1",
    "income tax returns acknowlegement year1",
    "income tax returns acknowlegement year 1",
    "incometaxreturnsacknowledgementyear1",
    "incometaxreturnsacknowlegementyear1",
    "income tax returns acknowledgement year2",
    "income tax returns acknowledgement year 2",
    "income tax returns acknowlegement year2",
    "income tax returns acknowlegement year 2",
    "incometaxreturnsacknowledgementyear2",
    "incometaxreturnsacknowlegementyear2",
    "income tax returns acknowledgement year3",
    "income tax returns acknowledgement year 3",
    "income tax returns acknowlegement year3",
    "income tax returns acknowlegement year 3",
    "incometaxreturnsacknowledgementyear3",
    "incometaxreturnsacknowlegementyear3"
}


def save_change_request_file(file, prefix=None):
    if not file or file.filename == "":
        return None, None

    safe_name = secure_filename(file.filename)
    if prefix:
        safe_name = f"{prefix}_{safe_name}"

    file_bytes = file.read()
    file.stream.seek(0)

    filepath = os.path.join(UPLOAD_FOLDER, safe_name)
    file.save(filepath)

    return safe_name, file_bytes


def normalize_label(value):
    cleaned = "".join(
        character.lower() if character.isalnum() else " "
        for character in (value or "")
    )
    return " ".join(cleaned.split())


def is_replacement_label(applicant_type, label):
    normalized = normalize_label(label)
    if not normalized:
        return False
    if applicant_type == "individual":
        return normalized in INDIVIDUAL_REPLACEMENT_LABELS
    return normalized in ORGANIZATION_REPLACEMENT_LABELS


def build_document_record(file, saved_name, file_bytes, document_type):
    record = {
        "stored_name": saved_name,
        "original_name": file.filename,
        "document_type": document_type
    }
    if file_bytes:
        record["data"] = base64.b64encode(file_bytes).decode("utf-8")
    return record


def pack_replacement_documents(replacement_documents):
    if not replacement_documents:
        return None, None

    files = []
    for label, doc in replacement_documents.items():
        files.append({
            "label": label,
            "stored_name": doc.get("stored_name"),
            "original_name": doc.get("original_name"),
            "data": doc.get("data")
        })

    primary_file_name = files[0].get("stored_name") if files else None
    payload_bytes = json.dumps({"files": files}).encode("utf-8")
    return primary_file_name, payload_bytes


def build_change_request_labels(change_request):
    labels = []
    field_changes = (
        (change_request.individual_field_changes or [])
        + (change_request.organization_field_changes or [])
    )

    for field in field_changes:
        issue = (field.get("issue") or "").strip()
        label = (field.get("label") or "").strip()
        if issue and label:
            labels.append(f"{issue} - {label}")
        elif label:
            labels.append(label)
        elif issue:
            labels.append(issue)

    seen = set()
    unique_labels = []
    for label in labels:
        normalized = label.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_labels.append(label)

    return unique_labels


def send_admin_change_request_mail(change_request, status):
    application_no = (change_request.application_no or "").strip()
    if not application_no:
        return {
            "success": False,
            "status_code": 400,
            "message": "Application number missing in change request"
        }

    contact_result = AgentRegistrationDetails.get_notification_details_by_application_no(
        application_no
    )
    if not contact_result.get("success"):
        return contact_result

    email = (contact_result.get("email") or "").strip()
    if not email:
        return {
            "success": False,
            "status_code": 404,
            "message": "Registered email not found for this application"
        }

    normalized_status = (status or "").strip().lower()
    if normalized_status == "approved":
        mail_sent = send_agent_change_request_approval_email(
            email,
            application_no,
            build_change_request_labels(change_request)
        )
        if not mail_sent:
            return {
                "success": False,
                "status_code": 500,
                "message": "Approval email could not be sent"
            }
        return {
            "success": True,
            "message": "Approval mail sent successfully",
            "email": email
        }

    if normalized_status == "rejected":
        mail_sent = send_agent_change_request_rejection_email(email, application_no)
        if not mail_sent:
            return {
                "success": False,
                "status_code": 500,
                "message": "Rejection email could not be sent"
            }
        return {
            "success": True,
            "message": "Rejection mail sent successfully",
            "email": email
        }

    return {
        "success": False,
        "status_code": 400,
        "message": "Unsupported status for mail sending"
    }


# =========================
# GET APPLICATION NUMBERS
# =========================

@agent_change_request_bp.route("/change-request/get-applications", methods=["POST"])
@jwt_required()
def get_application_numbers():

    try:

        data = request.get_json(force=True)
        pan = data.get("panNumber")

        if not pan:
            return jsonify({"error": "PAN number required"}), 400
        validation_error = validate_registration({
            "pan": pan
        })

        print("PAN =", pan)
        print("VALIDATION =", validation_error)
        
        if validation_error:
            return validation_error
        result = AgentRegistrationDetails.get_applications_by_pan(pan)

        if not result["success"]:
            return jsonify({
                "error": result["message"]
            }), 500

        result = AgentRegistrationDetails.get_applications_by_pan(pan)

        if not result["success"]:
            return jsonify({
                "error": result["message"]
            }), 500

        return jsonify({"applications": result["applications"]}), 200

    except Exception as e:

       agent_change_request_bp.logger.exception(
        "Error in get_application_numbers"
       )

    return jsonify({
        "error": "Internal server error"
    }), 500


@agent_change_request_bp.route(
    "/change-request/get-application-details/<application_no>",
    methods=["GET"]
)

def get_application_details(application_no):

    try:

        result = AgentRegistrationDetails.get_application_details_by_application_no(
            application_no
        )

        if result["success"]:
            return jsonify(result), 200

        return jsonify({
            "error": result["message"]
        }), 404

    except Exception as e:

       agent_change_request_bp.logger.exception(
    "Error in get_application_details"
)

    return jsonify({
    "error": "Internal server error"
    }), 500




@agent_change_request_bp.route("/admin/change-requests/full", methods=["GET"])
@jwt_required()
def get_full_change_requests():
    try:
        requests = db.session.query(AgentChangeRequest) \
            .order_by(AgentChangeRequest.created_at.desc()) \
            .all()

        results = []

        for req in requests:
            results.append({
                "id": req.id,

                # BASIC INFO
                "applicationNo": req.application_no,
                "panNumber": decrypt_value(req.pan_number) if req.pan_number else None,
                "applicantType": req.applicant_type,

                # ISSUE INFO
                "individualIssueType": req.individual_issue_type,
                "individualIssue": req.individual_issue,
                "individualDescription": req.individual_description,

                "organizationIssueType": req.organization_issue_type,
                "organizationIssue": req.organization_issue,
                "organizationDescription": req.organization_description,

                # CHANGE DOCUMENTS
                "individualChangeDocument": req.individual_change_document,
                "organizationChangeDocument": req.organization_change_document,

                # REPLACEMENT INFO
                "individualReplaceReason": req.individual_replace_reason,
                "organizationReplaceReason": req.organization_replace_reason,

                "individualReplacementFile": req.individual_replacement_file,
                "organizationReplacementFile": req.organization_replacement_file,

                # JSON FIELD CHANGES (OLD vs NEW DATA 🔥)
                "individualFieldChanges": req.individual_field_changes,
                "organizationFieldChanges": req.organization_field_changes,

                # FIELD DOCUMENTS (VERY IMPORTANT 🔥)
                "individualFieldDocuments": req.individual_field_documents,
                "organizationFieldDocuments": req.organization_field_documents,

                # STATUS
                "status": req.status,

                # DATE
                "submittedAt": req.created_at.strftime("%Y-%m-%d") if req.created_at else None
            })

        return jsonify({"requests": results}), 200

    except Exception as e:
       agent_change_request_bp.logger.exception(
    "Error in get_full_change_requests"
)

    return jsonify({
     "error": "Internal server error"
    }), 500


@agent_change_request_bp.route(
    "/admin/change-requests/<int:request_id>/approve",
    methods=["PUT"]
)
@jwt_required()
def approve_change_request(request_id):
    try:
        change_request = AgentChangeRequest.query.get(request_id)
        if not change_request:
            return jsonify({
                "error": "Change request not found"
            }), 404

        result = AgentChangeRequest.approve_and_apply(request_id)
        if result.get("success"):
            mail_result = send_admin_change_request_mail(change_request, "Approved")
            response_payload = dict(result)
            response_payload["mail_sent"] = bool(mail_result.get("success"))
            if mail_result.get("success"):
                response_payload["mail_message"] = mail_result.get("message")
                response_payload["mail_email"] = mail_result.get("email")
            else:
                response_payload["mail_error"] = mail_result.get("message")
            return jsonify(response_payload), 200

        status_code = result.get("status_code", 400)
        return jsonify({
            "error": result.get("message", "Unable to approve request")
        }), status_code
    except Exception as exc:
       agent_change_request_bp.logger.exception(
    "Error in approve_change_request"
)

    return jsonify({
       "error": "Internal server error"
    }), 500

@agent_change_request_bp.route(
    "/admin/change-requests/<int:request_id>/status",
    methods=["PUT"]
)
@jwt_required()
def update_change_request_status(request_id):
    try:
        data = request.get_json(silent=True) or {}
        status = (data.get("status") or "").strip()
        if not status:
            return jsonify({"error": "Status is required"}), 400

        change_request = AgentChangeRequest.query.get(request_id)
        if not change_request:
            return jsonify({
                "error": "Change request not found"
            }), 404

        result = AgentChangeRequest.update_status(request_id, status)
        if result.get("success"):
            response_payload = dict(result)
            if status.lower() == "rejected":
                mail_result = send_admin_change_request_mail(change_request, status)
                response_payload["mail_sent"] = bool(mail_result.get("success"))
                if mail_result.get("success"):
                    response_payload["mail_message"] = mail_result.get("message")
                    response_payload["mail_email"] = mail_result.get("email")
                else:
                    response_payload["mail_error"] = mail_result.get("message")
            return jsonify(response_payload), 200

        status_code = result.get("status_code", 400)
        return jsonify({
            "error": result.get("message", "Unable to update status")
        }), status_code
    except Exception as exc:
        agent_change_request_bp.logger.exception(
    "Error in update_change_request_status"
    )

    return jsonify({
    "error": "Internal server error"
    }), 500


# =========================
# SAVE CHANGE REQUEST
# =========================
UPLOAD_FOLDER = "uploads/change_requests"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@agent_change_request_bp.route("/change-request/save", methods=["POST"])
#@jwt_required()
def save_change_request():

    try:

        data = request.form

        # -------------------------
        # PARSE JSON FIELD CHANGES
        # -------------------------

        individual_field_changes = json.loads(
            data.get("individualFieldChanges", "[]")
        )

        organization_field_changes = json.loads(
            data.get("organizationFieldChanges", "[]")
        )

        individual_field_documents = {}
        organization_field_documents = {}
        individual_replacement_documents = {}
        organization_replacement_documents = {}

        # -------------------------
        # SAVE INDIVIDUAL FIELD DOCUMENTS
        # -------------------------

        for i, field in enumerate(individual_field_changes):
            file = request.files.get(f"individualFieldDocument_{i}")
            label = field.get("label", f"field_{i}")
            is_replacement_file = bool(field.get("isReplacementFile")) or is_replacement_label(
                "individual", label
            )
            document_type = "replacement" if is_replacement_file else "supporting"
            saved_name, file_bytes = save_change_request_file(
                file, f"individualFieldDocument_{i}"
            )

            if saved_name:
                document_record = build_document_record(
                    file, saved_name, file_bytes, document_type
                )
                individual_field_documents[label] = document_record
                if is_replacement_file:
                    individual_replacement_documents[label] = document_record

        # -------------------------
        # SAVE ORGANIZATION FIELD DOCUMENTS
        # -------------------------

        for i, field in enumerate(organization_field_changes):
            file = request.files.get(f"organizationFieldDocument_{i}")
            label = field.get("label", f"field_{i}")
            is_replacement_file = bool(field.get("isReplacementFile")) or is_replacement_label(
                "organization", label
            )
            document_type = "replacement" if is_replacement_file else "supporting"
            saved_name, file_bytes = save_change_request_file(
                file, f"organizationFieldDocument_{i}"
            )

            if saved_name:
                document_record = build_document_record(
                    file, saved_name, file_bytes, document_type
                )
                organization_field_documents[label] = document_record
                if is_replacement_file:
                    organization_replacement_documents[label] = document_record

        # -------------------------
        # GENERAL UPLOADS
        # -------------------------

        individual_document_name, individual_document_bytes = save_change_request_file(
            request.files.get("individualDocument")
        )
        organization_document_name, organization_document_bytes = save_change_request_file(
            request.files.get("organizationDocument")
        )

        # -------------------------
        # REPLACEMENT FILES
        # -------------------------

        individual_replace_name, individual_replace_bytes = save_change_request_file(
            request.files.get("individualReplacementFile"),
            "individualReplacement"
        )
        organization_replace_name, organization_replace_bytes = save_change_request_file(
            request.files.get("organizationReplacementFile"),
            "organizationReplacement"
        )
        (
            replacement_name_from_individual_fields,
            replacement_bytes_from_individual_fields
        ) = pack_replacement_documents(individual_replacement_documents)
        (
            replacement_name_from_organization_fields,
            replacement_bytes_from_organization_fields
        ) = pack_replacement_documents(organization_replacement_documents)

        if replacement_bytes_from_individual_fields:
            individual_replace_name = replacement_name_from_individual_fields
            individual_replace_bytes = replacement_bytes_from_individual_fields

        if replacement_bytes_from_organization_fields:
            organization_replace_name = replacement_name_from_organization_fields
            organization_replace_bytes = replacement_bytes_from_organization_fields

        # -------------------------
        # SAVE TO DATABASE
        # -------------------------
        validation_error = validate_registration({
            "pan": data.get("panNumber")
        })
        
        if validation_error:
            return validation_error
        change_request = AgentChangeRequest(

            pan_number=encrypt_value(data.get("panNumber")),
            application_no=data.get("applicationNo"),
            applicant_type=data.get("applicantType"),

            individual_issue_type=data.get("individualIssueType"),
            individual_issue=data.get("individualIssue"),
            individual_description=data.get("individualDescription"),
            individual_document=individual_document_name,
            individual_document_data=individual_document_bytes,
            individual_change_document=data.get("individualChangeDocument"),
            individual_replace_reason=data.get("individualReplaceReason"),
            individual_replacement_file=individual_replace_name,
            individual_replacement_file_data=individual_replace_bytes,

            organization_issue_type=data.get("organizationIssueType"),
            organization_issue=data.get("organizationIssue"),
            organization_description=data.get("organizationDescription"),
            organization_document=organization_document_name,
            organization_document_data=organization_document_bytes,
            organization_change_document=data.get("organizationChangeDocument"),
            organization_replace_reason=data.get("organizationReplaceReason"),
            organization_replacement_file=organization_replace_name,
            organization_replacement_file_data=organization_replace_bytes,

            # JSON DATA
            individual_field_changes=individual_field_changes,
            organization_field_changes=organization_field_changes,

            individual_field_documents=individual_field_documents,
            organization_field_documents=organization_field_documents
        )

        db.session.add(change_request)
        db.session.commit()

        return jsonify({
            "message": "Change request saved successfully"
        }), 201

    except Exception as e:

     agent_change_request_bp.logger.exception(
        "Error in save_change_request"
    )

    return jsonify({
        "error": "Operation failed. Please try again."
    }), 500

# ----------------------------------------------------
# --------------admin mail send api ------------------
# ----------------------------------------------------
@agent_change_request_bp.route(
    "/admin/change-requests/<int:request_id>/send-status-mail",
    methods=["POST"]
)
@jwt_required()
def send_change_request_status_mail_api(request_id):
    try:
        data = request.get_json(silent=True) or {}
        status = (data.get("status") or "").strip()
        if not status:
            return jsonify({"error": "Status is required"}), 400

        change_request = AgentChangeRequest.query.get(request_id)
        if not change_request:
            return jsonify({"error": "Change request not found"}), 404

        result = send_admin_change_request_mail(change_request, status)
        if result.get("success"):
            return jsonify(result), 200

        return jsonify({
            "error": result.get("message", "Unable to send status mail")
        }), result.get("status_code", 400)

    except Exception as exc:
       agent_change_request_bp.logger.exception(
    "Error in send_change_request_status_mail_api"
)

    return jsonify({
    "error": "Internal server error"
    }), 500