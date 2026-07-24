


import datetime
import json

from sqlalchemy import or_, text
from sqlalchemy.dialects.postgresql import JSONB

from app.models.database import db
from app.utils.encryption import encrypt_value, decrypt_value

def normalize_field_label(value):
    cleaned = "".join(
        character.lower() if character.isalnum() else " "
        for character in (value or "")
    )
    return " ".join(cleaned.split())


def parse_date_value(value):
    if value is None:
        return None
    date_text = str(value).strip()
    if not date_text:
        return None
    for date_format in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(date_text, date_format).date()
        except ValueError:
            continue
    return None


RAW_TEXT_LABEL_TO_COLUMN_MAP = {
    "Agent Name": "agent_name",
    "Father Name": "father_name",
    "Occupation": "occupation_name",
    "Email": "email",
    "Aadhaar Number": "aadhaar",
    "PAN Card": "pan",
    "PAN Number": "pan",
    "Mobile Number": "mobile",
    "Landline Number": "landline",
    "Registration Number / License Number": "license_number",
    "Registration Date": "license_date",
    "Address Line 1": "address1",
    "Address Line 2": "address2",
    "State": "state_id",
    "District": "district",
    "Mandal": "mandal",
    "Local Area / Village": "village",
    "PIN Code": "pincode",
    "Organization Name": "agent_name",
    "Organization Type": "organisation_type",
    "Registration Number": "registration_identifier",
    "GST Number": "gst_number"
}

TEXT_LABEL_TO_COLUMN_MAP = {
    normalize_field_label(label): column
    for label, column in RAW_TEXT_LABEL_TO_COLUMN_MAP.items()
}

RAW_FILE_FIELD_COLUMN_MAP = {
    "individual": {
        "Photograph": ("photograph", "jsonb"),
        "PAN Card Proof": ("pan_proof", "jsonb"),
        "Address Proof": ("address_proof", "jsonb"),
        "Income tax returns Acknowledgement year1": ("itr_year1", "jsonb"),
        "Income tax returns Acknowledgement year2": ("itr_year2", "jsonb"),
        "Income tax returns Acknowledgement year3": ("itr_year3", "jsonb")
    },
    "organization": {
        "Authorized Signatory Photo": ("photograph", "jsonb"),
        "Authorized Signature": ("legal_document", "text"),
        "Board Resolution for Authorized Signatory": ("legal_document", "text"),
        "Upload Registration Card": ("registration_cert_doc", "text"),
        "Upload Registration Certificate": ("registration_cert_doc", "text"),
        "Upload PAN Card": ("pan_proof", "jsonb"),
        "Upload GST": ("gst_doc", "text"),
        "Upload GST Certificate": ("gst_doc", "text"),
        "Address Proof": ("address_proof", "jsonb"),
        "Income tax returns Acknowledgement year1": ("itr_year1", "jsonb"),
        "Income tax returns Acknowledgement year2": ("itr_year2", "jsonb"),
        "Income tax returns Acknowledgement year3": ("itr_year3", "jsonb")
    }
}

FILE_FIELD_COLUMN_MAP = {
    applicant_type: {
        normalize_field_label(label): mapping
        for label, mapping in mapping_data.items()
    }
    for applicant_type, mapping_data in RAW_FILE_FIELD_COLUMN_MAP.items()
}


def get_document_by_label(field_documents, label):
    if not field_documents or not label:
        return None
    if field_documents.get(label):
        return field_documents.get(label)
    normalized_label = normalize_field_label(label)
    for key, value in field_documents.items():
        if normalize_field_label(key) == normalized_label:
            return value
    return None


class AgentRegistrationDetails(db.Model):

    __tablename__ = "agentregistration_details_t"

    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)

    pan = db.Column(db.String(20), nullable=False)

    application_no = db.Column(db.String(50), nullable=False)

    def to_dict(self):

        return {
            "application_no": self.application_no
        }

    @staticmethod
    def get_applications_by_pan(pan):
        try:
            query = text("""
                SELECT application_no
                FROM agentregistration_details_t
                WHERE UPPER(pan) = :pan
                ORDER BY id DESC
            """)

            rows = db.session.execute(
                query, {"pan": pan.strip().upper()}
            ).mappings().all()

            return {
                "success": True,
                "applications": [dict(row) for row in rows]
            }

        except Exception as e:
            return {
                "success": False,
                "message": "Internal server error"
            }

    @staticmethod
    def get_application_details_by_application_no(application_no):
        try:
            query = text("""
                SELECT
                a.agent_type,
                a.status,
                a.id AS agent_id,
                a.application_no,
                    a.agent_name,
                    a.father_name,
                    a.occupation_id,
                    o.occupation_name,
                    a.email,
                    a.aadhaar,
                    a.pan,
                    a.mobile,
                    a.landline,
                    a.license_number,
                    a.license_date,
                    a.address1,
                    a.address2,
                    a.pincode,
                    a.state_id,
                    sm.state_name AS state_name,
                    a.district,
                    dm.district_name AS district_name,
                    a.mandal,
                    mm.mandal_name AS mandal_name,
                    a.village,
                    vm.village_name AS village_name,
                    a.photograph,
                    a.pan_proof,
                    a.address_proof,
                    a.self_declared_affidavit,
                    a.itr_year1,
                    a.itr_year2,
                    a.itr_year3,
                    a.last_five_years_project_details,
                    a.any_civil_criminal_cases,
                    a.registration_other_states
                FROM agentregistration_details_t a
                LEFT JOIN occupation_master_t o
                    ON CAST(a.occupation_id AS text) = CAST(o.occupation_id AS text)
                LEFT JOIN state_master_t sm
                    ON CAST(a.state_id AS text) = CAST(sm.id AS text)
                LEFT JOIN districts_t dm
                    ON CAST(a.district AS text) = CAST(dm.id AS text)
                LEFT JOIN mandals_t mm
                    ON CAST(a.mandal AS text) = CAST(mm.id AS text)
                LEFT JOIN villages_t vm
                    ON CAST(a.village AS text) = CAST(vm.id AS text)
                WHERE a.application_no = :application_no
                LIMIT 1
            """)

            agent_row = db.session.execute(
                query, {"application_no": application_no}
            ).mappings().first()

            if not agent_row:
                return {
                    "success": False,
                    "message": "Application not found"
                }

            agent_id = agent_row["agent_id"]

            project_query = text("""
                SELECT id, project_name
                FROM agent_projects_t
                WHERE agent_id = :agent_id
                ORDER BY id
            """)

            litigation_query = text("""
                SELECT
                    id,
                    case_no,
                    tribunal_place,
                    petitioner_name,
                    respondent_name,
                    case_facts,
                    present_status,
                    interim_order,
                    final_order,
                    interim_order_certificate,
                    disposed_certificate
                FROM agent_litigations_t
                WHERE agent_id = :agent_id
                ORDER BY id
            """)

            other_state_query = text("""
                SELECT
                    id,
                    registration_number,
                    state_id,
                    state_name,
                    district
                FROM agent_other_state_rera_t
                WHERE agent_id = :agent_id
                ORDER BY id
            """)

            projects = db.session.execute(
                project_query, {"agent_id": agent_id}
            ).mappings().all()
            litigations = db.session.execute(
                litigation_query, {"agent_id": agent_id}
            ).mappings().all()
            other_states = db.session.execute(
                other_state_query, {"agent_id": agent_id}
            ).mappings().all()

            return {
                "success": True,
                "data": {
                    "agent_details": dict(agent_row),
                    "projects": [dict(project) for project in projects],
                    "litigations": [dict(litigation) for litigation in litigations],
                    "other_state_rera": [dict(state) for state in other_states]
                }
            }

        except Exception as e:
            return {
                "success": False,
                "message": "Internal server error"
            }

    @staticmethod
    def get_notification_details_by_application_no(application_no):
        try:
            query = text("""
                SELECT
                    application_no,
                    agent_name,
                    email
                FROM agentregistration_details_t
                WHERE application_no = :application_no
                LIMIT 1
            """)

            row = db.session.execute(
                query, {"application_no": application_no}
            ).mappings().first()

            if not row:
                return {
                    "success": False,
                    "status_code": 404,
                    "message": "Application not found in registration table"
                }

            return {
                "success": True,
                "application_no": row.get("application_no"),
                "agent_name": row.get("agent_name"),
                "email": decrypt_value(row.get("email")) if row.get("email") else None
            }

        except Exception as e:
            return {
                "success": False,
                "status_code": 500,
                "message": "Internal server error"
            }
       
       
        

class AgentChangeRequest(db.Model):

    __tablename__ = "agent_change_requests_t"

    id = db.Column(db.Integer, primary_key=True)

    pan_number = db.Column(db.String(20))
    application_no = db.Column(db.String(50))

    applicant_type = db.Column(db.String(50))

    individual_issue_type = db.Column(db.String(100))
    individual_issue = db.Column(db.String(200))
    individual_description = db.Column(db.Text)
    individual_document = db.Column(db.String(255))
    individual_change_document = db.Column(db.String(200))
    individual_replace_reason = db.Column(db.Text)
    individual_replacement_file = db.Column(db.String(255))
    individual_document_data = db.Column(db.LargeBinary)
    individual_replacement_file_data = db.Column(db.LargeBinary)

    organization_issue_type = db.Column(db.String(100))
    organization_issue = db.Column(db.String(200))
    organization_description = db.Column(db.Text)
    organization_document = db.Column(db.String(255))
    organization_change_document = db.Column(db.String(200))
    organization_replace_reason = db.Column(db.Text)
    organization_replacement_file = db.Column(db.String(255))
    organization_document_data = db.Column(db.LargeBinary)
    organization_replacement_file_data = db.Column(db.LargeBinary)

    # NEW JSON FIELDS
    individual_field_changes = db.Column(JSONB)
    organization_field_changes = db.Column(JSONB)

    individual_field_documents = db.Column(JSONB)
    organization_field_documents = db.Column(JSONB)

    status = db.Column(db.String(50), default="PENDING")

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_admin_dict(self, agent_name=None):
        issue_type = self.individual_issue_type or self.organization_issue_type or "N/A"
        document = self.individual_change_document or self.organization_change_document or ""

        if isinstance(agent_name, (list, tuple)):
            agent_name = agent_name[0] if agent_name else None

        return {
            "id": self.id,
            "applicationNo": self.application_no,
            "agentName": agent_name or self.pan_number or "N/A",
            "applicantType": self.applicant_type or "N/A",
            "issueType": issue_type,
            "document": document,
            "status": self.status,
            "submittedAt": self.created_at.strftime("%Y-%m-%d") if self.created_at else None
        }

    @staticmethod
    def update_status(request_id, status):
        try:
            change_request = AgentChangeRequest.query.get(request_id)
            if not change_request:
                return {
                    "success": False,
                    "status_code": 404,
                    "message": "Change request not found"
                }

            change_request.status = status
            db.session.commit()
            return {
                "success": True,
                "message": "Status updated successfully"
            }
        except Exception as exc:
            db.session.rollback()
            return {
                "success": False,
                "status_code": 500,
                "message": "Internal server error"
            }

    @staticmethod
    def approve_and_apply(request_id):
        try:
            change_request = AgentChangeRequest.query.get(request_id)
            if not change_request:
                return {
                    "success": False,
                    "status_code": 404,
                    "message": "Change request not found"
                }

            application_no = (change_request.application_no or "").strip()
            if not application_no:
                return {
                    "success": False,
                    "status_code": 400,
                    "message": "Application number missing in change request"
                }

            updates = {}
            field_changes = []
            for field in change_request.individual_field_changes or []:
                field_changes.append(("individual", field))
            for field in change_request.organization_field_changes or []:
                field_changes.append(("organization", field))

            for field_type, field in field_changes:
                label = field.get("label")
                normalized_label = normalize_field_label(label)
                new_value = str(field.get("newValue") or "").strip()

                field_documents = (
                    change_request.individual_field_documents
                    if field_type == "individual"
                    else change_request.organization_field_documents
                ) or {}
                document_record = get_document_by_label(field_documents, label)
                file_mapping = FILE_FIELD_COLUMN_MAP.get(field_type, {}).get(normalized_label)
                document_type = (
                    (document_record or {}).get("document_type") or ""
                ).strip().lower()
                is_replacement = (
                    bool(field.get("isReplacementFile"))
                    or bool(file_mapping)
                    or document_type == "replacement"
                )

                if is_replacement:
                    if not file_mapping or not document_record:
                        continue

                    column_name, column_type = file_mapping
                    if column_type == "jsonb":
                        stored_name = (document_record.get("stored_name") or "").strip()
                        if not stored_name:
                            continue
                        original_name = document_record.get("original_name")
                        file_extension = ""
                        if isinstance(stored_name, str) and "." in stored_name:
                            file_extension = stored_name.rsplit(".", 1)[-1].lower()
                        mime_type = (
                            "image/jpeg"
                            if file_extension in {"jpg", "jpeg"}
                            else "image/png"
                            if file_extension == "png"
                            else "application/pdf"
                            if file_extension == "pdf"
                            else "application/octet-stream"
                        )
                        updates[column_name] = {
                            "type": "jsonb",
                            "value": {
                                "stored_name": stored_name,
                                "original_name": original_name,
                                "mime_type": mime_type,
                                "path": f"uploads/change_requests/{stored_name}"
                            }
                        }
                    else:
                        stored_name = (document_record.get("stored_name") or "").strip()
                        if stored_name:
                            updates[column_name] = {
                                "type": "text",
                                "value": stored_name
                            }
                    continue

                column_name = TEXT_LABEL_TO_COLUMN_MAP.get(normalized_label)
                if not column_name or not new_value:
                    continue

                if column_name == "license_date":
                    parsed_date = parse_date_value(new_value)
                    if parsed_date:
                        updates[column_name] = {
                            "type": "date",
                            "value": parsed_date
                        }
                    continue

                updates[column_name] = {
                    "type": "text",
                    "value": new_value
                }

            if updates:
                set_clauses = []
                params = {"application_no": application_no}

                for index, (column_name, metadata) in enumerate(updates.items()):
                    param_name = f"val_{index}"
                    if metadata["type"] == "jsonb":
                        set_clauses.append(f"{column_name} = CAST(:{param_name} AS jsonb)")
                        params[param_name] = json.dumps(metadata["value"])
                    else:
                        set_clauses.append(f"{column_name} = :{param_name}")
                        params[param_name] = metadata["value"]

                update_query = text(
                    f"""
                    UPDATE agentregistration_details_t
                    SET {", ".join(set_clauses)}
                    WHERE application_no = :application_no
                    """
                )
                result = db.session.execute(update_query, params)
                if result.rowcount == 0:
                    db.session.rollback()
                    return {
                        "success": False,
                        "status_code": 404,
                        "message": "Application not found in registration table"
                    }

            change_request.status = "Approved"
            db.session.commit()

            return {
                "success": True,
                "message": "Change request approved and applied",
                "updated_columns": list(updates.keys())
            }

        except Exception as exc:
            db.session.rollback()
            return {
                "success": False,
                "status_code": 500,
                "message": "Internal server error"
            }

    @staticmethod
    def get_admin_requests(status=None, search=None, limit=200):
        query = db.session.query(
            AgentChangeRequest,
            AgentRegistrationDetails.agent_name.label("agent_name")
        ).outerjoin(
            AgentRegistrationDetails,
            AgentChangeRequest.application_no == AgentRegistrationDetails.application_no
        )

        if status and status != "All":
            query = query.filter(AgentChangeRequest.status == status)

        if search:
            like_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    AgentChangeRequest.application_no.ilike(like_pattern),
                    AgentChangeRequest.pan_number.ilike(like_pattern),
                    AgentRegistrationDetails.agent_name.ilike(like_pattern)
                )
            )

        query = query.order_by(AgentChangeRequest.created_at.desc()).limit(limit)

        results = []
        for change_request, agent_name in query.all():
            results.append(change_request.to_admin_dict(agent_name))
        return results