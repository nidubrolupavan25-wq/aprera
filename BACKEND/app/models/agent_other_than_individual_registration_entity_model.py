from app.models.database import db
from datetime import datetime
from app.utils.encryption import decrypt_value

class AgentOtherThanIndividualEntity(db.Model):
    __tablename__ = "agent_entity_details_t"

    id = db.Column(db.Integer, primary_key=True)
    organisation_id = db.Column(
        db.Integer, db.ForeignKey("agentregistration_details_t.id"), nullable=False
    )

    designation = db.Column(db.String(100))
    name = db.Column(db.String(150), nullable=False)
    email_id = db.Column(db.String(150))
    mobile_number = db.Column(db.String(15))

    state_ut = db.Column(db.String(100))
    district = db.Column(db.String(100))
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    pincode = db.Column(db.String(10))

    pan_card_number = db.Column(db.String(10))
    pan_card_doc = db.Column(db.String(255))
    aadhaar_number = db.Column(db.String(12))
    aadhaar_doc = db.Column(db.String(255))
    photograph = db.Column(db.String(255))
    address_proof = db.Column(db.String(255))

    entity_type = db.Column(db.String(255))  # PARTNER / DIRECTOR / TRUSTEE
    din_number = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "designation": self.designation,
            "name": self.name,
            "email_id": decrypt_value(self.email_id) if self.email_id else None,
            "mobile_number": decrypt_value(self.mobile_number) if self.mobile_number else None,
            "state_ut": self.state_ut,
            "district": self.district,
            "address_line1": self.address_line1,
            "address_line2": self.address_line2,
            "pincode": self.pincode,
            "pan_card_number": decrypt_value(self.pan_card_number) if self.pan_card_number else None,
            "pan_card_doc": self.pan_card_doc,
            "aadhaar_number": decrypt_value(self.aadhaar_number) if self.aadhaar_number else None,
            "aadhaar_doc": self.aadhaar_doc,
            "photograph": self.photograph,
            "address_proof": self.address_proof,
            "entity_type": self.entity_type,
            "din_number": self.din_number,
            "created_at": (
                self.created_at.strftime("%Y-%m-%d %H:%M:%S")
                if self.created_at
                else None
            ),
        }
