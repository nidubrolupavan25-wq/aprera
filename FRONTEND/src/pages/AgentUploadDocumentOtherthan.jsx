import { useState, useEffect } from "react";
import "../styles/AgentUploadDocumentOtherthan.css";
import { useNavigate, useLocation } from "react-router-dom";
import AgentStepper from "../components/AgentStepper";
import axios from "axios";

const BASE_URL = "https://k0mqkt9g-8081.inc1.devtunnels.ms/";

export default function AgentUploadDocumentOtherthan() {

  const navigate = useNavigate();
  const location = useLocation();

  const {
    application_id,
    organisation_id,
    pan_card_number,
  } = location.state || {};

  const [files, setFiles] = useState({
    year1: null,
    year2: null,
    year3: null,
    year1Url: null,
    year2Url: null,
    year3Url: null
  });

  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState("");
  const [loading, setLoading] = useState(false);

  console.log("📦 LOCATION STATE FULL:", location.state);

  /* ================= FETCH EXISTING DATA ================= */

  useEffect(() => {

    if (!organisation_id) return;

    const fetchExistingData = async () => {

      try {

        const res = await axios.get(
          `${BASE_URL}/api/agent/other-than-individual/details`,
          {
            params: { organisation_id }
          }
        );

        const result = res.data;

        if (result.status !== "success") return;

        const org = result.organisation || {};

        setFiles(prev => ({
          ...prev,
          year1Url: org.itr_year1_doc || null,
          year2Url: org.itr_year2_doc || null,
          year3Url: org.itr_year3_doc || null
        }));

      } catch (err) {
        console.error("ITR fetch error:", err);
      }

    };

    fetchExistingData();

  }, [organisation_id]);

  /* ================= FILE CHANGE ================= */

  const handleFileChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setShowError("Only PDF documents are allowed");
      e.target.value = "";
      return;
    }

    // Max file size 10MB
    if (file.size > 10 * 1024 * 1024) {
      setShowError("File size should be less than 10MB");
      e.target.value = "";
      return;
    }

    setFiles(prev => ({
      ...prev,
      [e.target.name]: file
    }));

    setShowError("");
  };

  /* ================= DOWNLOAD FILE ================= */

  const downloadFile = (file) => {

    if (!file) return;

    const url = URL.createObjectURL(file);

    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;

    link.click();

    URL.revokeObjectURL(url);

  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {

    setShowError("");
    setLoading(true);

    // 🔥 Check if at least one file is uploaded OR already exists
    const hasYear1 = files.year1 || files.year1Url;
    const hasYear2 = files.year2 || files.year2Url;
    const hasYear3 = files.year3 || files.year3Url;

    if (!hasYear1) {
      setShowError("Please Upload Income Tax Return Acknowledgement of Year 1");
      setLoading(false);
      return;
    }

    if (!hasYear2) {
      setShowError("Please Upload Income Tax Return Acknowledgement of Year 2");
      setLoading(false);
      return;
    }

    if (!hasYear3) {
      setShowError("Please Upload Income Tax Return Acknowledgement of Year 3");
      setLoading(false);
      return;
    }

    if (!agreed) {
      setShowError("Please check the Self Declaration");
      setLoading(false);
      return;
    }

    try {

      console.log("PAN from state:", pan_card_number);
      console.log("Organisation ID:", organisation_id);

      const formData = new FormData();

      formData.append("id", organisation_id);
      formData.append("pan_card_number", pan_card_number);

      // ✅ Only append if file exists (new file uploaded)
      if (files.year1) {
        formData.append("itr_year1", files.year1);
      }

      if (files.year2) {
        formData.append("itr_year2", files.year2);
      }

      if (files.year3) {
        formData.append("itr_year3", files.year3);
      }

      // Debug: Log FormData
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
      }

      const res = await fetch(
        `${BASE_URL}/api/agent/other-than-individual/itr`,
        {
          method: "PATCH",
          body: formData
        }
      );

      const data = await res.json();

      console.log("Response:", data);

      if (!res.ok) {
        setShowError(data.message || "Upload failed");
        setLoading(false);
        return;
      }

      alert("ITR Documents Uploaded Successfully ✅");

      navigate("/preview-other", {
        state: {
          application_id,
          organisation_id,
          pan_card_number,
        },
      });

    } catch (err) {
      console.error("Upload error:", err);
      setShowError("Server error. Try again later.");
      setLoading(false);
    }

  };

  /* ================= UI ================= */

  return (

    <div className="zagentud-page-wrapper">

      <div className="zagentud-breadcrumb">
        You are here : <a href="/home">Home</a> / Registration / <strong>Real Estate Agent Registration</strong>
      </div>

      <div className="zagentud-container">

        <h2 className="zagentud-heading">Real Estate Agent Registration</h2>

        <AgentStepper
          currentStep={1}
          applicationId={application_id}
          organisationId={organisation_id}
          panCardNumber={pan_card_number}
        />

        <h3 className="zagentud-section-heading">Upload Documents</h3>

        <p className="zagentud-note">
          <strong>Note :</strong> If the entity is registered below 3 years period and if the IT returns are not available for 3 years period agent has to upload the available IT returns.
        </p>

        {showError && (
          <div className="zagentud-inline-error">
            <span>⚠️ {showError}</span>
            <button
              type="button"
              className="zagentud-inline-error-close"
              onClick={() => setShowError("")}
            >
              ✕
            </button>
          </div>
        )}

        <table className="zagentud-table">

          <thead>
            <tr>
              <th>Document Name</th>
              <th>Upload Document</th>
              <th>Uploaded Document</th>
            </tr>
          </thead>

          <tbody>

            {/* YEAR 1 */}

            <tr>
              <td>Income Tax Return Acknowledgement Year 1 *</td>

              <td>
                <input
                  type="file"
                  name="year1"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </td>

              <td>

                {files.year1 ? (

                  <span
                    onClick={() => downloadFile(files.year1)}
                    style={{ cursor: "pointer", color: "#1e90ff", textDecoration: "underline" }}
                  >
                    📄 {files.year1.name}
                  </span>

                ) : files.year1Url ? (

                  <a
                    href={`${BASE_URL}${files.year1Url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#1e90ff" }}
                  >
                    📄 View Uploaded File
                  </a>

                ) : <span style={{ color: "#999" }}>-</span>}

              </td>

            </tr>

            {/* YEAR 2 */}

            <tr>
              <td>Income Tax Return Acknowledgement Year 2 *</td>

              <td>
                <input
                  type="file"
                  name="year2"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </td>

              <td>

                {files.year2 ? (

                  <span
                    onClick={() => downloadFile(files.year2)}
                    style={{ cursor: "pointer", color: "#1e90ff", textDecoration: "underline" }}
                  >
                    📄 {files.year2.name}
                  </span>

                ) : files.year2Url ? (

                  <a
                    href={`${BASE_URL}${files.year2Url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#1e90ff" }}
                  >
                    📄 View Uploaded File
                  </a>

                ) : <span style={{ color: "#999" }}>-</span>}

              </td>

            </tr>

            {/* YEAR 3 */}

            <tr>
              <td>Income Tax Return Acknowledgement Year 3 *</td>

              <td>
                <input
                  type="file"
                  name="year3"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
              </td>

              <td>

                {files.year3 ? (

                  <span
                    onClick={() => downloadFile(files.year3)}
                    style={{ cursor: "pointer", color: "#1e90ff", textDecoration: "underline" }}
                  >
                    📄 {files.year3.name}
                  </span>

                ) : files.year3Url ? (

                  <a
                    href={`${BASE_URL}${files.year3Url}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#1e90ff" }}
                  >
                    📄 View Uploaded File
                  </a>

                ) : <span style={{ color: "#999" }}>-</span>}

              </td>

            </tr>

          </tbody>

        </table>

        <div className="zagentud-declaration">  
          <h3 className="zagentud-section-heading">Declaration</h3>
          <div className="zagentud-declaration-row"> 
            <label className="zagentud-declaration-text">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)} 
              />
              <span> I/We </span> 
              <input type="text" className="zagentud-declaration-input" placeholder="Enter your name" /> 
              <span> solemnly affirm and declare that the particulars given above are correct to my/our knowledge and belief. </span> 
            </label>
          </div>
        </div>

        <div className="zagentud-declaration-actions">
          <button
            className="zagentud-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "⏳ Uploading..." : "💾 Save And Continue"}
          </button>
        </div>

      </div>

    </div>

  );
}