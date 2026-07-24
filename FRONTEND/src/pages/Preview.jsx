import "../styles/preview.css";
import "../styles/ApplicantDetails.css";


import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPost, BASE_URL } from "../api/api";
import { useLocation } from "react-router-dom";


const Preview = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const completedStep = Number(localStorage.getItem("completedStep") || 0);
  // ================= PARSE FILE FUNCTION =================
  const parseFile = (file) => {
    if (!file) return null;

    if (typeof file === "string") {
      try {
        return JSON.parse(file);
      } catch (err) {
        console.error("JSON parse error:", err);
        return null;
      }
    }

    return file;
  };

  // ================= FILE VIEW FUNCTION =================
const openFile = (fileObj) => {
  if (!fileObj || !fileObj.path) {
    alert("File not found");
    return;
  }

  let filepath = fileObj.path.replace(/\\/g, "/");

  const index = filepath.indexOf("uploads/");
  if (index !== -1) {
    filepath = filepath.substring(index);
  }

  const url = `${BASE_URL}/${filepath}`;

  window.open(url, "_blank");
};

useEffect(() => {
  localStorage.setItem("completedStep", "3");
}, []);
useEffect(() => {
  const step = Number(localStorage.getItem("completedStep") || 0);

  // 🔥 mark preview as reached
  if (step < 3) {
    localStorage.setItem("completedStep", "3");
  }
}, []);

  // ================= LOAD PREVIEW =================
  useEffect(() => {
    const agentId = localStorage.getItem("agentId");

    if (!agentId) {
      setError("Agent ID missing. Please start registration again.");
      setLoading(false);
      return;
    }

    apiGet(`/api/agent/preview/${agentId}`)
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.message || "Failed to load preview");
        }
      })
      .catch(() => {
        setError("Error fetching preview details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ================= SEND OTP =================
  const sendOtp = async () => {
    try {
      const agentId = data.agent_details.agent_id;

      const res = await apiPost("/api/otp/send-email", {
    panNumber: data.agent_details.pan,
});

      if (res.success) {
        alert("OTP sent to registered email");
        setOtpSent(true);
      } else {
        alert(res.message || "Failed to send OTP");
      }
    } catch (err) {
      alert("OTP service error");
    }
  };

  // ================= VERIFY OTP =================
  const verifyOtp = async () => {
    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    setVerifying(true);

    try {
    const res = await apiPost("/api/otp/verify", {
    panNumber: data.agent_details.pan,
    otp: otp,
});

      if (res.success) {
        alert("OTP verified successfully");
        setOtpVerified(true);
      } else {
        alert(res.message || "Invalid OTP");
      }
    } catch {
      alert("OTP verification failed");
    }

    setVerifying(false);
  };

  if (loading) return <div className="agentpreview-loading">Loading preview...</div>;
  if (error) return <div className="agentpreview-error">{error}</div>;

  const agent = data.agent_details;

  // ================= PARSE DOCUMENTS =================
  const photograph = parseFile(agent.photograph);
  const pan_proof = parseFile(agent.pan_proof);
  const address_proof = parseFile(agent.address_proof);
  const self_affidavit = parseFile(agent.self_declared_affidavit);

  const itr_year1 = parseFile(agent.itr_year1);
  const itr_year2 = parseFile(agent.itr_year2);
  const itr_year3 = parseFile(agent.itr_year3);

  return (
    <div className="agentpreview-main-container">
      {/* ================= BREADCRUMB ================= */}
      <div className="agentpreview-page-wrapper">

      <div className="agentpreview-breadcrumb-bar">
        You are here :
       <a href="/home"><span className="agentpreview-link">Home </span> </a>/
        <span> Registration </span> /
        <span className="agentpreview-active"> Real Estate Agent Registration</span>
      </div>

      <div className="agentpreview-content-padding">
        <h2 className="agentpreview-page-title">Real Estate Agent Registration</h2>
         {/* Stepper */}
    

 <div className="applicantdetails-stepper">
  {[
    { label: "Agent Detail", step: 1, path: "/applicant-details" },
    { label: "Upload Documents", step: 2, path: "/agent-upload-documents" },
    { label: "Preview", step: 3, path: "/agent-preview" },
    { label: "Payment", step: 4, path: "/agent-payment" },
    { label: "Acknowledgement", step: 5, path: "/agent-acknowledgement" },
  ].map((item) => {
    const isActive = item.step <= completedStep;

    // ✅ Payment should NOT be clickable in Preview
    const isClickable =
      item.step <= completedStep &&
      item.step !== 4;

    return (
      <div
        key={item.step}
        className="applicantdetails-step"
        style={{ cursor: isClickable ? "pointer" : "not-allowed" }}
        onClick={() => {
          if (!isClickable) return;
          navigate(item.path);
        }}
      >
        <div
          className={`applicantdetails-circle ${
            isActive ? "active" : ""
          }`}
        >
          {item.step}
        </div>
        <span>{item.label}</span>
      </div>
    );
  })}
</div>


<div className="agentpreview-print-area litigation-section">
        {/* ================= APPLICANT DETAILS ================= */}
        <h3 className="applicantdetails-section-title">Applicant Details</h3>

        <div className="agentpreview-preview-grid">
          <div className="agentpreview-preview-label">Agent Type</div>
          <div className="agentpreview-preview-value">{agent.agent_type || "N/A"}</div>

          <div className="agentpreview-preview-label">Agent Name</div>
          <div className="agentpreview-preview-value">{agent.agent_name}</div>

          <div className="agentpreview-preview-label">Father's Name</div>
          <div className="agentpreview-preview-value">{agent.father_name}</div>

          <div className="agentpreview-preview-label">Occupation</div>
          <div className="agentpreview-preview-value">{agent.occupation_name}</div>

          <div className="agentpreview-preview-label">Email Id</div>
          <div className="agentpreview-preview-value">{agent.email}</div>

          <div className="agentpreview-preview-label">Aadhaar Number</div>
          <div className="agentpreview-preview-value">{agent.aadhaar}</div>

          <div className="agentpreview-preview-label">PAN Card Number</div>
          <div className="agentpreview-preview-value">{agent.pan}</div>

          <div className="agentpreview-preview-label">Mobile Number</div>
          <div className="agentpreview-preview-value">{agent.mobile}</div>

          <div className="agentpreview-preview-label">Landline</div>
          <div className="agentpreview-preview-value">{agent.landline || "N/A"}</div>

          <div className="agentpreview-preview-label">License Number</div>
          <div className="agentpreview-preview-value">{agent.license_number || "N/A"}</div>

          <div className="agentpreview-preview-label">License Date</div>
          <div className="agentpreview-preview-value">{agent.license_date || "N/A"}</div>
        </div>

        {/* ================= LOCAL ADDRESS ================= */}
        <h3 className="applicantdetails-section-title">
          Local Address For Communication
        </h3>

        <div className="agentpreview-preview-grid">
          <div className="agentpreview-preview-label">Address Line 1</div>
          <div className="agentpreview-preview-value">{agent.address1}</div>

          <div className="agentpreview-preview-label">Address Line 2</div>
          <div className="agentpreview-preview-value">{agent.address2 || "N/A"}</div>

          <div className="agentpreview-preview-label">State</div>
          <div className="agentpreview-preview-value">{agent.state_name || "N/A"}</div>

          <div className="agentpreview-preview-label">District</div>
          <div className="agentpreview-preview-value">{agent.district_name || "N/A"}</div>

          <div className="agentpreview-preview-label">Mandal</div>
          <div className="agentpreview-preview-value">{agent.mandal_name || "N/A"}</div>

          <div className="agentpreview-preview-label">Village</div>
          <div className="agentpreview-preview-value">{agent.village_name || "N/A"}</div>

          <div className="agentpreview-preview-label">PIN Code</div>
          <div className="agentpreview-preview-value">{agent.pincode}</div>
        </div>

        {/* ================= UPLOADED DOCUMENTS ================= */}
        <h3 className="applicantdetails-section-title">Uploaded Documents</h3>

        <table className="agentpreview-doc-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Document</th>
              <th>File Name</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>1</td>
              <td>Photograph</td>
              <td>{photograph?.original_name || "N/A"}</td>
              <td>
                {photograph ? (
                  <button onClick={() => openFile(photograph)}>View</button>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>

            <tr>
              <td>2</td>
              <td>PAN Proof</td>
              <td>{pan_proof?.original_name || "N/A"}</td>
              <td>
                {pan_proof ? (
                  <button onClick={() => openFile(pan_proof)}>View</button>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>

            <tr>
              <td>3</td>
              <td>Address Proof</td>
              <td>{address_proof?.original_name || "N/A"}</td>
              <td>
                {address_proof ? (
                  <button onClick={() => openFile(address_proof)}>View</button>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>

            <tr>
              <td>4</td>
              <td>Self Declared Affidavit</td>
              <td>{self_affidavit?.original_name || "N/A"}</td>
              <td>
                {self_affidavit ? (
                  <button onClick={() => openFile(self_affidavit)}>View</button>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ================= PROJECTS ================= */}
        <div className="agentpreview-section-gap">
          <h3 className="applicantdetails-section-title">
            Projects Launched In The Past 5 Years
          </h3>

          <p className="agentpreview-preview-value">
            Last five years project details :{" "}
           <b>
  {agent.last_five_years_project_details?.value ? "Yes" : "No"}
</b>
          </p>

{(agent.last_five_years_project_details === true ||
  agent.last_five_years_project_details === "true" ||
  agent.last_five_years_project_details === "Yes" ||
  agent.last_five_years_project_details?.value === true) && (
                <table className="agentpreview-doc-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Project Name</th>
                </tr>
              </thead>
              <tbody>
                {data.projects && data.projects.length > 0 ? (
                  data.projects.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td>{p.project_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= LITIGATIONS ================= */}
        <div className="agentpreview-section-gap litigation-section">
           <div className="print-section">   {/* 🔥 ADD THIS WRAPPER */}
          <h3 className="applicantdetails-section-title">Litigations</h3>

          <p className="agentpreview-preview-value">
            Any Civil/Criminal Cases :{" "}
            <b>
 {agent.any_civil_criminal_cases === "true" ? "Yes" : "No"}
</b>
          </p>

{(agent.any_civil_criminal_cases === true ||
  agent.any_civil_criminal_cases === "true" ||
  agent.any_civil_criminal_cases === "Yes") && (
                <table className="agentpreview-doc-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Case No</th>
                  <th>Tribunal Name & Place</th>
                  <th>Petitioner</th>
                  <th>Respondent</th>
                  <th>Facts of Case</th>
                  <th>Present Status</th>
                  <th>Interim Order</th>
                  <th>Final Order</th>
                </tr>
              </thead>

              <tbody>
                {data.litigations && data.litigations.length > 0 ? (
                  data.litigations.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td>{l.case_no}</td>
                      <td>{l.tribunal_place}</td>
                      <td>{l.petitioner_name}</td>
                      <td>{l.respondent_name}</td>
                      <td>{l.case_facts}</td>
                      <td>{l.present_status}</td>
                      <td>{l.interim_order}</td>
                      <td>{l.final_order}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
            </div>
        </div>

        {/* ================= OTHER STATE RERA ================= */}
        <div className="agentpreview-section-gap">
          <h3 className="applicantdetails-section-title">
            Other State/UT RERA Registration Details
          </h3>

          <p className="agentpreview-preview-value">
            Do you have registration in other states :{" "}
            <b>{agent.registration_other_states || "No"}</b>
          </p>

{(agent.registration_other_states === true ||
  agent.registration_other_states === "true" ||
  agent.registration_other_states === "Yes") && (
                <table className="agentpreview-doc-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Registration Number</th>
                  <th>State/UT</th>
                  <th>District</th>
                </tr>
              </thead>

              <tbody>
                {data.other_state_rera && data.other_state_rera.length > 0 ? (
                  data.other_state_rera.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.registration_number}</td>
                      <td>{r.state_name}</td>
                      <td>{r.district}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">N/A</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

       {/* ================= ITR DOCUMENTS ================= */}
<div className="agentpreview-section-gap">
  <h3 className="applicantdetails-section-title">ITR Documents</h3>

  <table className="agentpreview-doc-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Document</th>
        <th>File Name</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>1</td>
        <td>ITR Year 1</td>
        <td>{itr_year1?.original_name || "N/A"}</td>
        <td>
          {itr_year1 ? (
            <button onClick={() => openFile(itr_year1)}>View</button>
          ) : (
            "N/A"
          )}
        </td>
      </tr>

      <tr>
        <td>2</td>
        <td>ITR Year 2</td>
        <td>{itr_year2?.original_name || "N/A"}</td>
        <td>
          {itr_year2 ? (
            <button onClick={() => openFile(itr_year2)}>View</button>
          ) : (
            "N/A"
          )}
        </td>
      </tr>

      <tr>
        <td>3</td>
        <td>ITR Year 3</td>
        <td>{itr_year3?.original_name || "N/A"}</td>
        <td>
          {itr_year3 ? (
            <button onClick={() => openFile(itr_year3)}>View</button>
          ) : (
            "N/A"
          )}
        </td>
      </tr>
    </tbody>
  </table>
</div>


        {/* ================= DECLARATION ================= */}
        <div className="agentpreview-section-gap">
          <h3 className="applicantdetails-section-title">Declaration</h3>

          <div className="agentpreview-declaration-center">
            <p className="agentpreview-declaration-text">
              I / We <b>{agent.agent_name}</b> solemnly affirm and declare that
              the particulars given above are true and correct to the best of my
              knowledge and belief.
            </p>

            <div className="agentpreview-otp-center-box">
              <label className="agentpreview-otp-label">Email OTP Verification *</label>

              <div className="agentpreview-otp-row">
                <input type="text" value={agent.email} readOnly />

                <button onClick={sendOtp}>
                  {otpSent ? "Resend OTP" : "Get OTP"}
                </button>
              </div>

              {otpSent && (
                <div className="agentpreview-otp-row">
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value)}
                  />

                  <button onClick={verifyOtp} disabled={verifying}>
                    {verifying ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= ACTION BUTTONS ================= */}
        <div className="agentpreview-form-footer-row">
          <button
            type="button"
            className="applicant-back-btn"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
</div>
          <div className="agentpreview-action-buttons space-top">
            <button className="agentpreview-submit-btn" onClick={() => window.print()}>
              Print
            </button>

            <button
              className="agentpreview-submit-btn primary"
              disabled={!otpVerified}
              onClick={async () => {
                const agentId = localStorage.getItem("agentId");
                await apiPost(`/api/agent/create-payment/${agentId}`);
                navigate("/agent-payment");
              }}
            >
              Proceed for Payment
            </button>
          </div>
        </div>

        {!otpVerified && (
          <p style={{ color: "red", marginTop: "10px", textAlign: "right" }}>
            * Please verify OTP before proceeding to payment
          </p>
        )}
      </div>
    </div>
    </div>
  );
};

export default Preview;