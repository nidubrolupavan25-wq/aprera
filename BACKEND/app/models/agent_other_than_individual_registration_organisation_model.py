from app.models.database import db
from datetime import datetime
import json
from app.utils.encryption import decrypt_value

class AgentOtherThanIndividualOrganisation(db.Model):
    __tablename__ = "agentregistration_details_t"

    id = db.Column(db.BigInteger, primary_key=True)

    agent_name = db.Column(db.String, nullable=False)
    father_name = db.Column(db.String, nullable=True)
    occupation_id = db.Column(db.Integer, nullable=True)

    email = db.Column(db.String, nullable=False)
    aadhaar = db.Column(db.String, nullable=True)
    pan = db.Column(db.String, nullable=False)

    mobile = db.Column(db.String, nullable=False)
    landline = db.Column(db.String, nullable=True)

    license_number = db.Column(db.String, nullable=True)
    license_date = db.Column(db.Date, nullable=True)

    address1 = db.Column(db.String, nullable=False)
    address2 = db.Column(db.String, nullable=True)

    state_id = db.Column(db.String, nullable=False)
    district = db.Column(db.String, nullable=False)
    mandal = db.Column(db.String, nullable=False)
    village = db.Column(db.String, nullable=False)

    pincode = db.Column(db.String, nullable=False)

    photograph = db.Column(db.JSON, nullable=False)
    pan_proof = db.Column(db.JSON, nullable=False)
    address_proof = db.Column(db.JSON, nullable=False)

    # ✅ These should be JSON fields
    itr_year1 = db.Column(db.JSON, nullable=True)
    itr_year2 = db.Column(db.JSON, nullable=True)
    itr_year3 = db.Column(db.JSON, nullable=True)

    declaration = db.Column(db.Boolean, nullable=True)

    occupation_name = db.Column(db.String, nullable=True)
    application_no = db.Column(db.String, nullable=True)
    agent_type = db.Column(db.String, nullable=True)

    any_civil_criminal_cases = db.Column(db.String, nullable=True)
    registration_other_states = db.Column(db.String, nullable=True)
    last_five_years_projects_details = db.Column(db.JSON)

    self_declared_affidavit = db.Column(db.JSON, nullable=True)

    organisation_type = db.Column(db.String, nullable=True)
    registration_identifier = db.Column(db.String, nullable=True)
    registration_date = db.Column(db.String, nullable=True)

    gst_number = db.Column(db.String, nullable=True)
    gst_doc = db.Column(db.String, nullable=True)

    registration_cert_doc = db.Column(db.String, nullable=True)
    legal_document = db.Column(db.String, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)

    last_five_years_projects_details = db.Column(db.JSON, nullable=True)

    @staticmethod
    def is_application_exists(application_no):
        try:
            from sqlalchemy import text

            query = text(
                """
                SELECT 1
                FROM agentregistration_details_t
                WHERE application_no = :application_no
                LIMIT 1
            """
            )

            result = db.session.execute(
                query, {"application_no": application_no}
            ).fetchone()

            return True if result else False

        except Exception:
            return False

    def to_dict(self):
        return {
            "organisation_id": self.id,
            "application_id": self.application_no,
            "organisation_type": self.organisation_type,
            "organisation_name": self.agent_name,
            "registration_identifier": self.registration_identifier,
            "registration_date": self.registration_date,
            "registration_cert_doc": self.registration_cert_doc,
            "pan_card_number": decrypt_value(self.pan) if self.pan else None,
            "pan_card_doc": (
                self.pan_proof.get("file") if self.pan_proof else None
            ),
            "gst_number": self.gst_number,
            "gst_doc": self.gst_doc,
            "legal_document": self.legal_document,
            "email_id": decrypt_value(self.email) if self.email else None,
            "mobile_number": decrypt_value(self.mobile) if self.mobile else None,
            "landline_number": self.landline,
            "address_line1": self.address1,
            "address_line2": self.address2,
            "state": self.state_id,
            "district": self.district,
            "mandal": self.mandal,
            "village": self.village,
            "pincode": self.pincode,
            "address_proof_doc": (
                self.address_proof.get("file") if self.address_proof else None
            ),
            "last_five_year_projects": self.last_five_years_projects_details or [],
            "other_state_rera_details": (
                json.loads(self.registration_other_states)
                if self.registration_other_states
                else []
            ),
            "status": "success",
            "created_at": (
                self.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if self.created_at
                else None
            ),
            # ✅ ITR fields
            "itr_year1_doc": self.itr_year1.get("file") if self.itr_year1 else None,
            "itr_year2_doc": self.itr_year2.get("file") if self.itr_year2 else None,
            "itr_year3_doc": self.itr_year3.get("file") if self.itr_year3 else None,
        }