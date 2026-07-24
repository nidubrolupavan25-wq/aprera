import { useState } from "react";
import { apiPost } from "../api/api";
import "../styles/agentDetailsExisting.css";
import { useNavigate } from "react-router-dom";

const steps = [
  "Agent Detail",
  "Upload Documents",
  "Preview",
  "Payment",
  "Acknowledgement",
];

const AgentDetailExisting = () => {
  const [pan, setPan] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /* SEND OTP */
  const handleGetOtp = async () => {
    if (pan.length !== 10) {
      alert("Please enter valid PAN number");
      return;
    }

    try {
      setLoading(true);

      await apiPost("api/otp/send-email", {
        panNumber: pan,
      });

      setOtpSent(true);
      alert("OTP sent to registered email");
    } catch (error) {
      alert(
        error?.error ||
        error?.message ||
        "PAN not registered or OTP not sent"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ✅ VERIFY OTP - FIXED */
  const handleVerifyOtp = async () => {
    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    try {
      // ✅ Correct endpoint - uses existing OTP controller
      const res = await apiPost("api/otp/verify", {
        panNumber: pan,
        otp,
      });

      console.log("✅ VERIFY RESPONSE:", res);

    if (res.success) {

    sessionStorage.setItem("agent_pan", pan);

    localStorage.setItem("token", res.token);

    localStorage.setItem("agent_id", res.agent_id);

    console.log("TOKEN SAVED:", res.token);

    navigate("/agent-dashboard");
    }else {
        alert(res.error || "Invalid or expired OTP");
      }
    } catch (error) {
      console.error("❌ Verify Error:", error);
      alert(
        error?.error ||
        error?.message ||
        "Invalid or expired OTP"
      );
    }
  };

  return (
    <div className="agentexisting-registration-page">
      <div className="agentexisting-outer-box">

        <div className="agentexisting-breadcrumb-box">
          You are here :
          <a href="/home"> <span className="agentexisting-crumb-link"> Home </span> </a>/
          <span> Registration </span> /
          <span> Real Estate Agent Registration</span>
        </div>

        <h2 className="agentexisting-page-title">Real Estate Agent Registration</h2>

        <div className="agentexisting-stepper-box">
          <div className="agentexisting-stepper-line"></div>
          {steps.map((step, index) => (
            <div className="agentexisting-stepper-item" key={index}>
              <div className={`agentexisting-stepper-circle ${index === 0 ? "active" : ""}`}>
                {index + 1}
              </div>
              <div className="agentexisting-stepper-text">{step}</div>
            </div>
          ))}
        </div>

        <div className="agentexisting-form-box">
          <div className="agentexisting-pan-wrapper">

            <div className="agentexisting-pan-input-group">
              <label>
                PanCard Number <span className="agentexisting-required">*</span>
              </label>
              <input
                type="text"
                value={pan}
                maxLength={10}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="PanCard Number"
              />
            </div>

            <button className="agentexisting-btn-primary" onClick={handleGetOtp}>
              {otpSent ? "Resend OTP" : "Get OTP"}
            </button>
          </div>

          {otpSent && (
            <div className="agentexisting-pan-wrapper">
              <div className="agentexisting-pan-input-group">
                <label>
                  OTP <span className="agentexisting-required">*</span>
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
              </div>

              <button className="agentexisting-btn-primary" onClick={handleVerifyOtp}>
                Verify OTP
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AgentDetailExisting;