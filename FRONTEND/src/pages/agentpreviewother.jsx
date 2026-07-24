import "../styles/previewOther.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import AgentStepper from "../components/AgentStepper";

const BASE_URL = "https://k0mqkt9g-8081.inc1.devtunnels.ms";
const getFileUrl = (path) => {
  if (!path) return "#";
  return `${BASE_URL}/api/${path}`;
};

const PreviewOther = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state || {};

  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ OTP States only
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const organisation_id = location.state?.organisation_id;
  const pan_card_number = location.state?.pan_card_number;

  const org = apiData?.organisation || {};

  let projects = [];
  if (Array.isArray(org.last_five_year_projects)) {
    projects = org.last_five_year_projects;
  } else if (typeof org.last_five_year_projects === "string") {
    try {
      projects = JSON.parse(org.last_five_year_projects);
    } catch (e) {
      projects = [];
    }
  }

  const hasProjects = navState.hasProjects || (projects.length > 0 ? "Yes" : "No");
  const hasOtherRera = navState.hasOtherRera || (org?.other_state_rera_details?.length > 0 ? "Yes" : "No");

  const [ids] = useState(() => ({
    application_id: location.state?.application_id,
    organisation_id: location.state?.organisation_id,
    pan_card_number: location.state?.pan_card_number,
  }));

  /* ================= API CALL ================= */

  useEffect(() => {
    if (!organisation_id || !pan_card_number) {
      navigate("/agent-details");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/agent/other-than-individual/details`,
          {
            params: {
              organisation_id: organisation_id,
            },
          }
        );

        if (res.data.status === "success") {
          console.log("API Full Response:", res.data);
          setApiData(res.data);
        } else {
          setError("Failed to fetch data");
        }
      } catch (err) {
        console.error(err);
        setError("Server error while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organisation_id, pan_card_number, navigate]);

  const directors = apiData?.entities || [];
  const authorizedList = apiData?.authorized || [];
  const litigations = apiData?.litigations || [];
  const auth = authorizedList[0] || {};
  const hasSelfAffidavit = litigations[0]?.self_declared_affidavit ? true : false;
  const hasLitigationFinal = hasSelfAffidavit ? "No" : "Yes";
  const otherStates = org.other_state_rera_details || [];

  /* ================= OTP FUNCTIONS ================= */

  const handleSendOTP = async () => {
    setOtpError("");
    setOtpSuccess("");
    setOtpLoading(true);

    // ✅ Use original PAN from API response
    const pan = org.pan_card_number;

    if (!pan) {
      setOtpError("PAN not available. Please refresh.");
      setOtpLoading(false);
      return;
    }

    console.log("📱 Sending OTP for PAN:", pan);

    try {
      const response = await axios.post(
        `${BASE_URL}/api/otp/send-email`,
        { panNumber: pan },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📱 OTP Response:", response.data);

      if (response.data.success) {
        setOtpSuccess("✅ OTP sent successfully to registered email!");
        setShowOtpInput(true);
        setTimer(60);
        
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        window.otpInterval = interval;
      } else {
        setOtpError(response.data.error || "Failed to send OTP");
      }
    } catch (err) {
      console.error("OTP Error:", err);
      if (err.response) {
        setOtpError(err.response.data?.error || "Server error. Please try again.");
      } else if (err.request) {
        setOtpError("No response from server. Check your connection.");
      } else {
        setOtpError("Error sending OTP. Please try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setOtpError("Please enter valid OTP");
      return;
    }

    try {
      setOtpLoading(true);
      
      // ✅ Use original PAN from API response
      const pan = org.pan_card_number;
      
      const response = await axios.post(
        `${BASE_URL}/api/otp/verify`,
        {
          panNumber: pan,
          otp: otp,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ OTP Verification Response:", response.data);

      if (response.data.success) {
        setOtpSuccess("✅ OTP Verified Successfully!");
        setOtpError("");
        setIsOtpVerified(true);
        setShowOtpInput(false);
        
        setTimeout(() => {
          alert("Mobile number verified successfully! ✅");
        }, 500);
      } else {
        setOtpError(response.data.error || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP Verification Error:", err);
      if (err.response) {
        setOtpError(err.response.data?.error || "OTP verification failed");
      } else {
        setOtpError("OTP verification failed. Please try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (window.otpInterval) {
        clearInterval(window.otpInterval);
      }
    };
  }, []);

  /* ================= LOADING / ERROR ================= */

  if (loading) {
    return <div className="mpreview-loading">Loading...</div>;
  }

  if (error) {
    return <div className="mpreview-error">{error}</div>;
  }

  /* ================= UI ================= */

  return (
    <div className="mpreview-page-container">
      {/* TITLE */}
      <h2 className="mpreview-title">Real Estate Agent Registration</h2>

      <AgentStepper 
        currentStep={2}
        applicationId={ids.application_id}
        organisationId={ids.organisation_id}
        panCardNumber={ids.pan_card_number}
      />

      {/* ================= AGENT TYPE ================= */}
      <div className="mpreview-agent-type">
        <b>Agent Type :</b> Other Than Individual<br />
        <b>Organisation Registration No :</b>{org.agent_registration_no || "NA"}
      </div>

      {/* ================= ORGANISATION ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Organisation Details</h3>
        <div className="mpreview-grid">
          <p><b>Organisation Type:</b> {org.organisation_type}</p>
          <p><b>Organisation Name:</b> {org.organisation_name}</p>
          <p>
            <b>{org.organisation_type === "Trust/Society"
              ? "Trust Number :"
              : org.organisation_type === "Company"
              ? "CIN no :"
              : org.organisation_type === "Joint Venture"
              ? "CIN no :" 
              : "Registration No :"}</b>{org.registration_identifier}
          </p>
          <p>
            <b>{org.organisation_type === "Trust/Society"
              ? "Date of Trust Registration :"
              : "Date of Registration :"}</b> {org.registration_date}
          </p>
          <p>
            <b>Registration Certificate:</b>{" "}
            <a href={getFileUrl(org.registration_cert_doc)} target="_blank" rel="noreferrer">
              View
            </a>
          </p>
          <p><b>PAN Card Number:</b> {org.pan_card_number}</p>
          <p>
            <b>PAN card Proof:</b>{" "}
            <a href={getFileUrl(org.pan_card_doc)} target="_blank" rel="noreferrer">
              View
            </a>
          </p>
          <p><b>Email ID:</b> {org.email_id}</p>
          <p><b>Mobile Number:</b> {org.mobile_number}</p>
          <p><b>GST Num:</b> {org.gst_number || "NA"}</p>
          <p>
            <b>GST Num Document:</b>{" "}
            {org.gst_doc ? (
              <a href={getFileUrl(org.gst_doc)} target="_blank" rel="noreferrer">
                View
              </a>
            ) : "NA"}
          </p>
          <p>
            <b>{org.organisation_type === "Trust/Society"
              ? "Upload Trust Deed"
              : org.organisation_type === "Partnership/LLP Firm"
              ? "Upload Partnership Deed"
              : org.organisation_type === "Government Department/Local Bodies/Government Bodies"
              ? "Upload Partnership Deed" 
              : "Memorandum of articles/Bye-laws :"}</b>{" "}
            <a href={getFileUrl(org.address_proof_doc)} target="_blank" rel="noreferrer">
              View
            </a>
          </p>
        </div>
      </section>

      {/* ================= LOCAL ADDRESS ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Local Address For Communication</h3>
        <div className="mpreview-grid">
          <p><b>Address Line 1:</b> {org.address_line1 || "NA"}</p>
          <p><b>Address Line 2:</b> {org.address_line2 || "NA"}</p>
          <p><b>State:</b> {org.state || "NA"}</p>
          <p><b>District:</b> {org.district || "NA"}</p>
          <p><b>Mandal:</b> {org.mandal || "NA"}</p>
          <p><b>Village:</b> {org.village || "NA"}</p>
          <p><b>PIN Code:</b> {org.pincode || "NA"}</p>
          <p>
            <b>Address proof:</b>{" "}
            <a href={getFileUrl(org.address_proof_doc)} target="_blank" rel="noreferrer">
              View
            </a>
          </p>
        </div>
      </section>

      {/* ================= DIRECTOR DETAILS ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">
          {org.organisation_type === "Trust/Society"
            ? "Trustee Details"
            : org.organisation_type === "Partnership/LLP Firm"
            ? "Partner Details" 
            : "Director Details"}
        </h3>
        <div className="mpreview-table-wrapper">
          <table className="mpreview-director-table wide-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Nationality</th>
                <th>Designation</th>
                <th>Name</th>
                <th>DIN</th>
                <th>Aadhaar</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>State/UT</th>
                <th>District</th>
                <th>Address Line 1</th>
                <th>Address Line 2</th>
                <th>PIN Code</th>
                <th>PAN</th>
                <th>Address Proof</th>
                <th>PAN Proof</th>
                <th>Aadhaar Proof</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>
              {directors.map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{d.entity_type}</td>
                  <td>{d.designation}</td>
                  <td>{d.name}</td>
                  <td>{d.din_number}</td>
                  <td>{d.aadhaar_number}</td>
                  <td>{d.email_id}</td>
                  <td>{d.mobile_number}</td>
                  <td>{d.state_ut}</td>
                  <td>{d.district}</td>
                  <td>{d.address_line1}</td>
                  <td>{d.address_line2}</td>
                  <td>{d.pincode}</td>
                  <td>{d.pan_card_number}</td>
                  <td>
                    {d.address_proof ? (
                      <a href={getFileUrl(d.address_proof)} target="_blank">View Address</a>
                    ) : "NA"}
                  </td>
                  <td>
                    {d.pan_card_doc ? (
                      <a href={getFileUrl(d.pan_card_doc)} target="_blank">View PAN</a>
                    ) : "NA"}
                  </td>
                  <td>
                    {d.aadhaar_doc ? (
                      <a href={getFileUrl(d.aadhaar_doc)} target="_blank">View Aadhaar</a>
                    ) : "NA"}
                  </td>
                  <td>
                    {d.photograph ? (
                      <img
                        src={getFileUrl(d.photograph)}
                        className="mpreview-photo"
                        alt="Entity"
                      />
                    ) : "NA"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= AUTHORIZED ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Authorized Signatory</h3>
        <div className="mpreview-grid">
          <p><b>Name:</b> {auth.name}</p>
          <p><b>Mobile Number:</b> {auth.mobile_number}</p>
          <p><b>Email ID:</b> {auth.email_id}</p>
          <p>
            <b>Photo:</b>{" "}
            <img
              src={getFileUrl(auth.photo)}
              className="mpreview-photo-large"
              alt="Authorized"
            />
          </p>
          <p>
            <b>Board Resolution for authorized signatory:</b>{" "}
            <a href={getFileUrl(auth.board_resolution)} target="_blank" rel="noreferrer">
              View
            </a>
          </p>
        </div>
      </section>

      {/* ================= PROJECTS ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Projects Launched In The Past 5 Years</h3>
        <p className="mpreview-yesno">
          <b>Last five years project details :</b> {hasProjects}
        </p>
        {hasProjects === "Yes" && (
          <table className="mpreview-director-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Project Name</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.project_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ================= LITIGATIONS ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Litigations</h3>
        <p className="mpreview-yesno">
          <b>Any Civil/Criminal Cases :</b> {hasLitigationFinal}
        </p>
        {hasSelfAffidavit && (
          <p>
            <b>Self Declared Affidavit Document :</b>{" "}
            <a
              href={getFileUrl(litigations[0]?.self_declared_affidavit)}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
          </p>
        )}
        {!hasSelfAffidavit && (
          <div className="mpreview-table-wrapper">
            <table className="mpreview-director-table wide-table">
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
                  <th>Final Order if Disposed</th>
                  <th>Interim Certificate</th>
                  <th>Final Order Certificate</th>
                </tr>
              </thead>
              <tbody>
                {litigations.map((l, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{l.case_no}</td>
                    <td>{l.tribunal_name_place}</td>
                    <td>{l.petitioner_name}</td>
                    <td>{l.respondent_name}</td>
                    <td>{l.case_facts}</td>
                    <td>{l.present_status}</td>
                    <td>{l.interim_order ? "Yes" : "No"}</td>
                    <td>{l.final_order_details ? "Yes" : "No"}</td>
                    <td>
                      {l.interim_order ? (
                        <a href={getFileUrl(l.interim_order)} target="_blank">View</a>
                      ) : "NA"}
                    </td>
                    <td>
                      {l.final_order_details ? (
                        <a href={getFileUrl(l.final_order_details)} target="_blank">View</a>
                      ) : "NA"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================= OTHER STATE RERA ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Other State/UT RERA Registration Details</h3>
        <p className="mpreview-yesno">
          <b>Do you have registration in other states :</b> {hasOtherRera}
        </p>
        {hasOtherRera === "Yes" && (
          <div className="mpreview-table-wrapper">
            <table className="mpreview-director-table wide-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Registration Number</th>
                  <th>State/UT</th>
                  <th>District</th>
                </tr>
              </thead>
              <tbody>
                {otherStates.map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{s.rera_no}</td>
                    <td>{s.state}</td>
                    <td>{s.district}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================= ITR DETAILS ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">ITR Details</h3>
        <div className="mpreview-table-wrapper">
          <table className="mpreview-director-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>ITR Of Preceding Year 1</th>
                <th>ITR Of Preceding Year 2</th>
                <th>ITR Of Preceding Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  {org.itr_year1_doc ? (
                    <a href={getFileUrl(org.itr_year1_doc)} target="_blank">View</a>
                  ) : "NA"}
                </td>
                <td>
                  {org.itr_year2_doc ? (
                    <a href={getFileUrl(org.itr_year2_doc)} target="_blank">View</a>
                  ) : "NA"}
                </td>
                <td>
                  {org.itr_year3_doc ? (
                    <a href={getFileUrl(org.itr_year3_doc)} target="_blank">View</a>
                  ) : "NA"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= DECLARATION ================= */}
      <section className="mpreview-section">
        <h3 className="mpreview-heading">Declaration</h3>

        <div className="mpreview-declaration">
          <label className="mpreview-declare-line">
            <input type="checkbox" />
            I/We <b>{org.organisation_name}</b> solemnly affirm and
            declare that the particulars given above are correct.
          </label>

          {/* ✅ OTP ROW - Only this changed */}
          <div className="mpreview-otp-row">
            <div>
              <label>
                Mobile Number <span className="mpreview-required">*</span>
              </label>
              <input
                type="text"
                value={org.mobile_number || "6301836044"}
                readOnly
              />
            </div>
            <button 
              className="mpreview-otp-btn"
              onClick={handleSendOTP}
              disabled={otpLoading || timer > 0 || isOtpVerified}
            >
              {otpLoading ? "Sending..." : timer > 0 ? `Resend in ${timer}s` : isOtpVerified ? "✅ Verified" : "Get OTP"}
            </button>
          </div>

          {/* ✅ OTP Input - Only added */}
          {showOtpInput && !isOtpVerified && (
            <div className="mpreview-otp-row" style={{ marginTop: '10px' }}>
              <div>
                <label>
                  Enter OTP <span className="mpreview-required">*</span>
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setOtpError("");
                  }}
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  style={{ width: '200px' }}
                />
              </div>
              <button 
                className="mpreview-verify-btn"
                onClick={handleVerifyOTP}
                disabled={otpLoading || !otp || otp.length < 4}
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          )}

          {/* ✅ Messages - Only added */}
          {otpError && (
            <div className="mpreview-otp-error" style={{ color: 'red', marginTop: '10px' }}>
              ⚠️ {otpError}
            </div>
          )}
          {otpSuccess && (
            <div className="mpreview-otp-success" style={{ color: 'green', marginTop: '10px' }}>
              ✅ {otpSuccess}
            </div>
          )}
          {isOtpVerified && (
            <div className="mpreview-otp-verified" style={{ color: 'green', marginTop: '10px', fontWeight: 'bold' }}>
              ✅ Mobile number verified successfully!
            </div>
          )}
        </div>
      </section>

      {/* ================= ACTION ================= */}
      <div className="mpreview-actions">
        <button className="mpreview-btn" onClick={() => window.print()}>
          Print
        </button>

        <button
          className="mpreview-btn primary"
          onClick={() => {
            if (!isOtpVerified) {
              alert("⚠️ Please verify your mobile number with OTP first!");
              return;
            }
            navigate("/agent-paymentpage", {
              state: {
                application_no: org.application_id,
                name: directors[0]?.name || "",
                mobile: org.mobile_number,
              },
            });
          }}
        >
          Proceed to Pay
        </button>
      </div>
    </div>
  );
};

export default PreviewOther;