import { useEffect, useState } from "react";
import { apiGet } from "../api/api";
import { useNavigate } from "react-router-dom";
import "../styles/AgentDashboard.css";

const AgentDashboard = () => {
  const [activeTab, setActiveTab] = useState("partial");
  const [applications, setApplications] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const url =
      activeTab === "partial"
        ? "/api/agent/partial-applications"
        : "/api/agent/shortfall-applications";

    apiGet(url)
      .then((res) => {
        console.log("FULL RESPONSE 👉", res);

        if (res.success) {
          setApplications(res.data || []);
        } else {
          setApplications([]);
        }
      })
      .catch((err) => {
        console.error("API ERROR", err);
        setApplications([]);
      });
  }, [activeTab]);

  // ✅ Replace old function with this one
  const openApplication = (app) => {
    console.log("Clicked Application:", app);

    localStorage.setItem("agentId", app.application_id);
    sessionStorage.setItem("application_no", app.application_no);

    navigate("/applicant-details", {
      state: {
        agentId: app.application_id,
      },
    });
  };

  return (
    <div className="agent-dashboard-wrapper">
      <div className="agent-sidebar">
        <div
          className={`menu-item ${activeTab === "partial" ? "active" : ""}`}
          onClick={() => setActiveTab("partial")}
        >
          Partial Applications
        </div>

        <div
          className={`menu-item ${activeTab === "shortfall" ? "active" : ""}`}
          onClick={() => setActiveTab("shortfall")}
        >
          Shortfall Applications
        </div>
      </div>

      <div className="agent-content">
        <h3 className="page-title">
          {activeTab === "partial"
            ? "Partial Applications"
            : "Shortfall Applications"}
        </h3>

        <table className="agent-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Application No</th>
              <th>Name</th>
              <th>Name Type</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {applications.length > 0 ? (
              applications.map((app, i) => (
                <tr key={app.application_id}>
                  <td>{i + 1}</td>

                  <td>
                    <span
                      className="application-link"
                      onClick={() => openApplication(app)}
                    >
                      {app.application_no}
                    </span>
                  </td>

                  {/* ✅ Backend returns 'name' */}
                  <td>{app.name}</td>

                  <td>{app.name_type}</td>

                  <td>{app.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentDashboard;