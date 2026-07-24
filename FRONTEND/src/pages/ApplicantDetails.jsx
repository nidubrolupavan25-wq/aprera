import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/ApplicantDetails.css";
import { apiGet,apiPost } from "../api/api";

const ApplicantDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const completedStep = Number(localStorage.getItem("completedStep") || 0);

  const passedPan = location.state?.pan || "";
  const [litigationStatus, setLitigationStatus] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [agentType, setAgentType] = useState("Individual");

  //const applicationNo = sessionStorage.getItem("application_no");
  const [interimOrder, setInterimOrder] = useState(null);
  const [finalOrder, setFinalOrder] = useState(null);
  const [otherStateReg, setOtherStateReg] = useState(null);


// ===== Projects (Last 5 Years) =====
const [projectName, setProjectName] = useState("");
const [projects, setProjects] = useState([]);
const [litigations, setLitigations] = useState([]);
const [litigationForm, setLitigationForm] = useState({
  caseNo: "",
  namePlace: "",
  petitioner: "",
  respondent: "",
  facts: "",
  presentStatus: "",
  interimOrder: "No",
  finalOrder: "No",
  interimCert: null,
  disposedCert: null,
});
const [uploadedFiles, setUploadedFiles] = useState({
  photograph: null,
  panProof: null,
  addressProof: null,
  //selfAffidavitFile: null,
});
const [savedFiles, setSavedFiles] = useState({
  selfAffidavit: null,
});


// ===== Other State RERA =====
// ===== Other State RERA =====
//const [otherStateReg, setOtherStateReg] = useState("No");

const [otherReraForm, setOtherReraForm] = useState({
  regNo: "",
  stateId: "",
  stateName: "",
  districtId: "",
  districtName: "",
});

const [otherReraList, setOtherReraList] = useState([]);
  
  // Location dropdowns
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [villages, setVillages] = useState([]);
  // const [otherStates, setOtherStates] = useState([]);
  const [otherDistricts, setOtherDistricts] = useState([]);
  const [otherStateId, setOtherStateId] = useState("");
  const [otherDistrictId, setOtherDistrictId] = useState("");

const [otherStates] = useState([
  { id: 1, state_name: "Andhra Pradesh" },
  { id: 2, state_name: "Arunachal Pradesh" },
  { id: 3, state_name: "Assam" },
  { id: 4, state_name: "Bihar" },
  { id: 5, state_name: "Chhattisgarh" },
  { id: 6, state_name: "Goa" },
  { id: 7, state_name: "Gujarat" },
  { id: 8, state_name: "Haryana" },
  { id: 9, state_name: "Himachal Pradesh" },
  { id: 10, state_name: "Jharkhand" },
  { id: 11, state_name: "Karnataka" },
  { id: 12, state_name: "Kerala" },
  { id: 13, state_name: "Madhya Pradesh" },
  { id: 14, state_name: "Maharashtra" },
  { id: 15, state_name: "Manipur" },
  { id: 16, state_name: "Meghalaya" },
  { id: 17, state_name: "Mizoram" },
  { id: 18, state_name: "Nagaland" },
  { id: 19, state_name: "Odisha" },
  { id: 20, state_name: "Punjab" },
  { id: 21, state_name: "Rajasthan" },
  { id: 22, state_name: "Sikkim" },
  { id: 23, state_name: "Tamil Nadu" },
  { id: 24, state_name: "Telangana" },
  { id: 25, state_name: "Tripura" },
  { id: 26, state_name: "Uttar Pradesh" },
  { id: 27, state_name: "Uttarakhand" },
  { id: 28, state_name: "West Bengal" },
  { id: 29, state_name: "Delhi" }
]);



  const [form, setForm] = useState({
    agentName: "",
    fatherName: "",
    occupation: "",
    occupationName: "",
    email: "",
    aadhaar: "",
    pan: "",
    panProof: null,
    mobile: "",
    landline: "",
    licenseNumber: "",
    licenseDate: "",
    address1: "",
    address2: "",
    state: "",
    district: "",
    mandal: "",
    village: "",
    pincode: "",
    addressProof: null,
    
  });

  


useEffect(() => {
  // ✅ clear ONLY when PAN comes from PAN-entry flow
  if (passedPan && !location.state?.agentId) {
    localStorage.removeItem("agentId");
    localStorage.removeItem("completedStep");
  }
}, [passedPan, location.state]);

useEffect(() => {
  if (passedPan) {
    setForm((prev) => ({
      ...prev,
      pan: passedPan,
    }));
  }
}, [passedPan]);


useEffect(() => {
  if (passedPan) return;

  const agentId =
    location.state?.agentId || localStorage.getItem("agentId");

  if (!agentId) return;
  console.log("Location State =", location.state);
  console.log("LocalStorage agentId =", localStorage.getItem("agentId"));

  apiGet(`/api/agent/preview/${agentId}`)
    .then((res) => {

      console.log("Preview Response:", res);

      const {
        agent_details,
        projects,
        litigations,
        other_state_rera,
      } = res.data;
      

      /* ================= BASIC FORM ================= */
      setForm({
        agentName: agent_details.agent_name || "",
        fatherName: agent_details.father_name || "",
        occupation: agent_details.occupation_id || "",
        occupationName: agent_details.occupation_name || "",
        email: agent_details.email || "",
        aadhaar: agent_details.aadhaar || "",
        pan: agent_details.pan || "",
        mobile: agent_details.mobile || "",
        landline: agent_details.landline || "",
        licenseNumber: agent_details.license_number || "",
       licenseDate: agent_details.license_date
  ? new Date(agent_details.license_date).toISOString().slice(0, 10)
  : "",

        address1: agent_details.address1 || "",
        address2: agent_details.address2 || "",
        state: agent_details.state_id || "",
        district: agent_details.district || "",
        mandal: agent_details.mandal || "",
        village: agent_details.village || "",
        pincode: agent_details.pincode || "",
      });

      /* ================= FILES ================= */
      setUploadedFiles({
        photograph: agent_details.photograph,
        panProof: agent_details.pan_proof,
        addressProof: agent_details.address_proof,
       // selfAffidavitFile: agent_details.self_declared_affidavit,
      });
      setSavedFiles({
  selfAffidavit: agent_details.self_declared_affidavit,
});


      /* ================= PROJECTS ================= */
 /* ================= PROJECTS ================= */

// create project list
const projectList = projects.map((p) => ({
  id: p.id,
  name: p.project_name,
}));

// set table data
setProjects(projectList);

// if projects exist => Yes
// if no projects => No
setShowProjects(projectList.length > 0);

      /* ================= LITIGATIONS ================= */
 const litigationList = litigations.map((l) => ({
  id: l.id,
  caseNo: l.case_no,
  namePlace: l.tribunal_place,
  petitioner: l.petitioner_name,
  respondent: l.respondent_name,
  facts: l.case_facts,
  presentStatus: l.present_status,
  interimOrder: l.interim_order,
  finalOrder: l.final_order,
  interimCert: l.interim_order_certificate,
  disposedCert: l.disposed_certificate,
}));

setLitigations(litigationList);

// if rows exist => Yes else No
setLitigationStatus(litigationList.length > 0 ? "Yes" : "No");
      setLitigations(
        litigations.map((l) => ({
          id: l.id,
          caseNo: l.case_no,
          namePlace: l.tribunal_place,
          petitioner: l.petitioner_name,
          respondent: l.respondent_name,
          facts: l.case_facts,
          presentStatus: l.present_status,
          interimOrder: l.interim_order,
          finalOrder: l.final_order,
          interimCert: l.interim_order_certificate,
          disposedCert: l.disposed_certificate,
        }))
      );
      // ✅ Restore Interim & Final Order radios
if (litigations && litigations.length > 0) {
  setInterimOrder(litigations[0].interim_order || "No");
  setFinalOrder(litigations[0].final_order || "No");
}


      /* ================= OTHER STATE RERA ================= */
   const otherReraRows = other_state_rera.map((r) => ({
  id: r.id,
  regNo: r.registration_number,
  stateId: r.state_id,
  stateName: r.state_name,
  districtName: r.district,
}));

setOtherReraList(otherReraRows);

// if rows exist => Yes else No
setOtherStateReg(otherReraRows.length > 0);
      setOtherReraList(
        other_state_rera.map((r) => ({
          id: r.id,
          regNo: r.registration_number,
          stateId: r.state_id,
          stateName: r.state_name,
          districtName: r.district,
        }))
      );
      setOtherReraForm({
  regNo: "",
  stateId: "",
  stateName: "",
  districtId: "",
  districtName: "",
});

    });
}, []);


  //  useEffect(() => {
  //   if (!passedPan) return;

  //   const savedForm = localStorage.getItem(`applicantForm_${passedPan}`);

  //   if (savedForm) {
  //     setForm(JSON.parse(savedForm));
  //   } else {
  //     setForm((prev) => ({ ...prev, pan: passedPan }));
  //   }
  // }, [passedPan]);

  // useEffect(() => {
  // if (!form.pan) return;

  // localStorage.setItem(
  //   `applicantForm_${form.pan}`,
  //   JSON.stringify(form)
  // );

  // localStorage.setItem("currentPan", form.pan);
  // }, [form]);


//  useEffect(() => {
//   sessionStorage.removeItem("application_no");
//   localStorage.removeItem("agentId");

//   setForm({
//     agentName: "",
//     fatherName: "",
//     occupation: "",
//     occupationName: "",
//     email: "",
//     aadhaar: "",
//     pan: passedPan || "",
//     photograph: null,
//     panProof: null,
//     mobile: "",
//     landline: "",
//     licenseNumber: "",
//     licenseDate: "",
//     address1: "",
//     address2: "",
//     state: "",
//     district: "",
//     mandal: "",
//     village: "",
//     pincode: "",
//     addressProof: null,
//   });

//   setLitigationStatus(null);
//   setShowProjects(null);
//   setOtherStateReg(null);   // 👈 ADD THIS LINE
//   setAgentType("Individual");
// }, []);


  // Fetch occupations
  useEffect(() => {
    apiGet("/api/occupations")
      .then((res) => {
        if (res.success) {
          setOccupations(res.data);
        }
      })
      .catch((err) => console.error("Occupation API error:", err));
  }, []);

  // Fetch states on mount
  useEffect(() => {
    apiGet("/api/states")
      .then((res) => {
        setStates(res || []);
      })
      .catch((err) => console.error("States API error:", err));
  }, []);

 


  // Fetch districts when state changes
  useEffect(() => {
    if (form.state) {
      apiGet(`/api/districts/${form.state}`)
        .then((res) => {
          setDistricts(res || []);
          setMandals([]);
          setVillages([]);
        })
        .catch((err) => console.error("Districts API error:", err));
    }
  }, [form.state]);

  // Fetch mandals when district changes
  useEffect(() => {
  if (!form.district) return;

  apiGet(`/api/mandals/${form.district}`)
    .then((res) => {
      setMandals(res || []);
    })
    .catch((err) => console.error("Mandals API error:", err));
}, [form.district]);


  // Fetch villages when mandal changes
  useEffect(() => {
  if (!form.mandal) return;

  apiGet(`/api/villages/${form.mandal}`)
    .then((res) => {
      setVillages(res || []);
    })
    .catch((err) => console.error("Villages API error:", err));
}, [form.mandal]);

useEffect(() => {
  if (
    villages.length > 0 &&
    form.village &&
    !villages.find(v => v.id == form.village)
  ) {
    // re-set village after villages are loaded
    setForm(prev => ({
      ...prev,
      village: prev.village,
    }));
  }
}, [villages]);


// useEffect(() => {
//   apiGet("/api/states")
//     .then((res) => {
//       console.log("Other States API response:", res); // 👈 IMPORTANT

//       const data =
//         res?.data && Array.isArray(res.data)
//           ? res.data
//           : Array.isArray(res)
//           ? res
//           : [];

//       setOtherStates(
//         data.map((s) => ({
//           state_id: s.state_id ?? s.id,
//           state_name: s.state_name ?? s.name,
//         }))
//       );
//     })
//     .catch((err) => console.error("Other States API error:", err));
// }, []);



  
  
 useEffect(() => {
  if (!otherStateId) return;

  apiGet(`/api/districts/${otherStateId}`)
    .then((res) => {
      console.log("Other Districts API response:", res);

      const data =
        res?.data && Array.isArray(res.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

      setOtherDistricts(
        data.map((d) => ({
          district_id: d.district_id ?? d.id,
          district_name: d.district_name ?? d.name,
        }))
      );
    })
    .catch((err) => console.error("Other Districts API error:", err));
}, [otherStateId]);


  
    const [showProjects, setShowProjects] = useState(null);
    // const [showOtherState, setShowOtherState] = useState(null)

  /* -------------------- HANDLERS -------------------- */


  // Add project
const handleAddProject = () => {
  if (!projectName.trim()) {
    alert("Please enter Project Name");
    return;
  }

  const newProject = {
    id: Date.now(), // temporary id (backend will replace later)
    name: projectName,
  };

  setProjects([...projects, newProject]);
  setProjectName("");
};

// Delete project
const handleDeleteProject = (id) => {
  setProjects(projects.filter((p) => p.id !== id));
};

// ===== Litigation handlers =====
const handleLitigationChange = (e) => {
  const { name, value } = e.target;
  setLitigationForm({ ...litigationForm, [name]: value });
};

const handleAddLitigation = () => {
  if (
    !litigationForm.caseNo ||
    !litigationForm.namePlace ||
    !litigationForm.petitioner ||
    !litigationForm.respondent ||
    !litigationForm.presentStatus
  ) {
    alert("Please fill all required fields");
    return;
  }

  // Case No Validation
  if (!/^[A-Z0-9]{3,20}$/.test(litigationForm.caseNo.trim())) {
    return alert(
      "Case No should contain only CAPITAL letters and numbers"
    );
  }

  // Name & Place Validation
  if (!/^[A-Za-z0-9 ]{3,100}$/.test(litigationForm.namePlace.trim())) {
    return alert(
      "Name & Place should contain only letters, numbers and spaces"
    );
  }

  // Petitioner Validation
  if (!/^[A-Za-z ]{3,50}$/.test(litigationForm.petitioner.trim())) {
    return alert(
      "Petitioner Name should contain only alphabets and spaces"
    );
  }

  // Respondent Validation
  if (!/^[A-Za-z ]{3,50}$/.test(litigationForm.respondent.trim())) {
    return alert(
      "Respondent Name should contain only alphabets and spaces"
    );
  }

 // Facts Validation ONLY when litigation = Yes
if (
  litigationStatus === "Yes" &&
  litigationForm.facts &&
  !/^[A-Za-z0-9 ]{3,250}$/.test(litigationForm.facts.trim())
) {
  return alert(
    "Facts of the Case should contain only letters, numbers and spaces"
  );
}



  // ===== ADD ROW TO TABLE =====
  const newLitigation = {
    id: Date.now(),
    ...litigationForm,
  };

  setLitigations([...litigations, newLitigation]);

  // ===== RESET FORM =====
  setLitigationForm({
    caseNo: "",
    namePlace: "",
    petitioner: "",
    respondent: "",
    facts: "",
    presentStatus: "",
    interimOrder: "No",
    finalOrder: "No",
    interimCert: null,
    disposedCert: null,
  });

  setInterimOrder("No");
  setFinalOrder("No");
};

const handleDeleteLitigation = (id) => {
  setLitigations(litigations.filter((l) => l.id !== id));
};

// Add Other State RERA
const handleAddOtherRera = () => {

  if (
    !otherReraForm.regNo ||
    !otherReraForm.stateId ||
    !otherReraForm.districtName
  ) {
    alert("Please fill all fields");
    return;
  }

  // Registration validation
  if (
    !/^[A-Za-z0-9\/-]{9,13}$/.test(
      otherReraForm.regNo.trim()
    )
  ) {
    alert(
      "Registration Number must be 9 to 13 characters"
    );
    return;
  }

  // create CLEAN object
  const newRow = {
    id: Date.now(),
    regNo: otherReraForm.regNo,
    stateId: Number(otherReraForm.stateId), // INTEGER ONLY
    stateName: otherReraForm.stateName,
    districtName: otherReraForm.districtName,
  };

  setOtherReraList((prev) => [...prev, newRow]);

  // reset
  setOtherReraForm({
    regNo: "",
    stateId: "",
    stateName: "",
    districtName: "",
  });
};

// Delete row
const handleDeleteOtherRera = (id) => {
  setOtherReraList(otherReraList.filter((r) => r.id !== id));
};


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, [fieldName]: file });
    }
  };

  const validateFile = (file, type) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    if (type === "jpg" && !name.endsWith(".jpg")) {
      alert("Only JPG files allowed");
      return false;
    }
    if (type === "pdf" && !name.endsWith(".pdf")) {
      alert("Only PDF files allowed");
      return false;
    }
    return true;
  };

  /* -------------------- VALIDATION -------------------- */
  const handleSaveContinue = async () => {

  if (!form.agentName) return alert("Please Enter Agent Name");
   if (!form.agentName.trim())
    return alert("Please Enter Agent Name");
  // Agent Name : only letters and spaces
  if (!/^[A-Za-z ]+$/.test(form.agentName.trim()))
    return alert("Agent Name should contain only letters");


  if (!form.photograph && !uploadedFiles.photograph)
  return alert("Please Upload Photograph");
if (!form.fatherName.trim())
  return alert("Please Enter Father Name");

// Father's Name validation
if (!/^[A-Za-z ]{3,50}$/.test(form.fatherName.trim())) {
  return alert(
    "Father Name must be 3 to 50 letters and contain only alphabets"
  );
}  if (!form.occupation) return alert("Please Select Occupation");
  if (!form.email) return alert("Please Enter Email");
    // Email Validation
  if (
    !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email)
  )
    return alert("Please Enter Valid Email Id");


  if (form.aadhaar.length !== 12) return alert("Aadhaar Number must be 12 digits");
  if (!form.panProof && !uploadedFiles.panProof)
  return alert("Please Upload PAN Card");
  if (form.pan.length !== 10) return alert("PAN Card must be 10 digits");
  if (!form.mobile) return alert("Please Enter Mobile Number");

    // Landline Validation (optional field)
  if (
    form.landline &&
    !/^[0-9-]{8,15}$/.test(form.landline)
  )
    return alert("Please Enter Valid Land Line Number");


 

  if (!form.address1) return alert("Please Enter Address Line 1");
  if (!form.state) return alert("Please Select State");
  if (!form.district) return alert("Please Select District");
  if (!form.mandal) return alert("Please Select Mandal");
  if (!form.village) return alert("Please Select Local Area / Village");
  if (!form.pincode) return alert("Please Enter PIN Code");
 if (!form.addressProof && !uploadedFiles.addressProof)
  return alert("Please Upload Address Proof");
   if (litigationStatus === null)
    return alert("Please select Yes or No for Litigations");

   // License Date Validation
if (form.licenseDate) {
  const today = new Date().toISOString().split("T")[0];

  if (form.licenseDate > today) {
    return alert("License Issued Date cannot be a future date");
  }
}
  if (litigationStatus === "No" && !uploadedFiles.selfAffidavitFile) {
  return alert("Please upload Self Declared Affidavit file");
}

  if (showProjects === null)
    return alert("Please select Yes or No for Projects");

  if (otherStateReg === null)
    return alert("Please select Yes or No for Other State RERA");
  // ================= CONDITIONAL VALIDATIONS =================

  // 🔹 Projects
  if (showProjects === true && projects.length === 0) {
    return alert("Please add at least one Project");
  }

  // 🔹 Litigations
  if (litigationStatus === "Yes" && litigations.length === 0) {
    return alert("Please add at least one Litigation record");
  }
  // if (litigationStatus === "No" && litigations.length === 0) {
  //   return alert("Please choose the file");
  // }

  // 🔹 Other State RERA
  if (otherStateReg === true && otherReraList.length === 0) {
    return alert("Please add at least one Other State RERA registration");
  }
  {uploadedFiles.photograph && (
  <small style={{ color: "green" }}>Already uploaded</small>
)}


  try {
    const formData = new FormData();

    // text fields
    Object.entries(form).forEach(([key, value]) => {
      if (
        key !== "photograph" &&
        key !== "panProof" &&
        key !== "addressProof"
      ) {
        formData.append(key, value);
      }
    });

    // file fields
    formData.append("agentType", agentType);
    formData.append("photograph", form.photograph);
    formData.append("panProof", form.panProof);
    formData.append("addressProof", form.addressProof);
    if (uploadedFiles.selfAffidavitFile) {
  formData.append("selfAffidavit", uploadedFiles.selfAffidavitFile);

}
formData.append("last_five_years_project_details", showProjects ? "Yes" : "No");
formData.append("any_civil_criminal_cases", litigationStatus);   // "Yes" or "No"
formData.append("registration_other_states", otherStateReg ? "Yes" : "No");
formData.append("projects", JSON.stringify(projects));
const cleanLitigations = litigations.map((l) => ({
  caseNo: l.caseNo,
  namePlace: l.namePlace,
  petitioner: l.petitioner,
  respondent: l.respondent,
  facts: l.facts,
  presentStatus: l.presentStatus,
  interimOrder: l.interimOrder,
  finalOrder: l.finalOrder,
}));
formData.append("litigations", JSON.stringify(cleanLitigations));

// append interim and disposed certificate files separately
litigations.forEach((l, index) => {
  if (l.interimCert) {
    formData.append(`interimCert_${index}`, l.interimCert);
  }
  if (l.disposedCert) {
    formData.append(`disposedCert_${index}`, l.disposedCert);
  }
});
formData.append("otherReraList", JSON.stringify(otherReraList));


   // append agent_id
formData.append("agent_id", localStorage.getItem("agentId"));

// ✅ ACTUAL API CALL
const response = await apiPost("/api/agent/register-step1", formData);



   if (response.success) {
  localStorage.setItem("agentId", response.agent_id);

  // ✅ THIS IS THE ONLY PLACE STEP-1 MUST BE SET
  localStorage.setItem("completedStep", "1");

  setShowSuccessPopup(true);
}
else {
      alert(response.message || "Failed to save applicant details");
    }
  } catch (error) {
    console.error(error);
    alert("Something went wrong while saving");
  }
//   if (response.success) {
//   setSavedFiles({
//     selfAffidavit: uploadedFiles.selfAffidavitFile,
//   });
// }
};

  /* -------------------- UI -------------------- */
  return (
    <div className="applicantdetails-page-wrapper">
      <div className="applicantdetails-rera-container">
        {/* Breadcrumb */}
        <div className="applicantdetails-breadcrumb">
          You are here :
       <a href="/"> <span className="applicantdetails-link"> Home </span> </a>/
        <span> Registration </span> /
          <span>Real Estate Agent Registration</span>
        </div>

        <div className="applicantdetails-content-box">
          <h2 className="applicantdetails-page-title">Real Estate Agent Registration</h2>

          {/* Stepper */}
      <div className="applicantdetails-stepper">
  {[
    { label: "Agent Detail", path: "/applicant-details", step: 1 },
    { label: "Upload Documents", path: "/agent-upload-documents", step: 2 },
    { label: "Preview", path: "/agent-preview", step: 3 },
    { label: "Payment", path: "", step: 4 },
    { label: "Acknowledgement", path: "/agent-acknowledgement", step: 5 },
  ].map((item) => {
    const isClickable = item.step <= completedStep + 1;
     (item.step === completedStep + 1 && completedStep < 3);

    return (
      <div
        key={item.step}
        className="applicantdetails-step"
        style={{
          cursor: isClickable ? "pointer" : "not-allowed",
          opacity: isClickable ? 1 : 0.4,
        }}
        onClick={() => {
          if (!isClickable) {
            alert("Please complete previous step first");
            return;
          }

          navigate(item.path, {
            state: { agentId: localStorage.getItem("agentId") },
          });
        }}
      >
        <div
          className={`applicantdetails-circle ${
             item.step === 1 || item.step <= completedStep ? "active" : ""
          }`}
        >
          {item.step}
        </div>

        <span>{item.label}</span>
      </div>
    );
  })}
</div>


          {/* Applicant Details */}
          <section className="applicantdetails-section">
  <h3 className="applicantdetails-section-title">Agent Type</h3>

  <div className="applicantdetails-radio-inline">
  <label>
    <input
      type="radio"
      name="agentType"
      value="Individual"
      checked={true}
      disabled
    />
    Individual
  </label>

  <label style={{ marginLeft: "30px", color: "#999" }}>
    <input
      type="radio"
      name="agentType"
      value="Other"
      disabled
    />
    Other than individual
  </label>
</div>
</section>
          <section className="applicantdetails-section">
            <h3 className="applicantdetails-section-title">Applicant Details</h3>

            <div className="applicantdetails-grid-4">
              <div>
                <label className="required">Agent Name</label>
                <input name="agentName" value={form.agentName} onChange={handleChange} placeholder="Agent Name"/>
              </div>

              <div>
                <label className="required">Upload Photograph (JPG)</label>
                <input
                  type="file"
                  accept=".jpg"
                  onChange={(e) => {
                    if (validateFile(e.target.files[0], "jpg")) {
                      handleFileChange(e, "photograph");
                    }
                  }}
                />
                
{/* {uploadedFiles.photograph && (
  <small style={{ color: "green" }}>
    ✔ Photograph already uploaded
  </small>
)} */}
              </div>

              <div>
                <label className="required">Father's Name</label>
                <input name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Father Name"/>
              </div>

              <div>
                <label className="required">Occupation</label>
                <select
                  name="occupation"
                  value={form.occupation}
                  onChange={(e) => {
                    const selected = occupations.find(
                      (o) => o.occupation_id == e.target.value
                    );
                    setForm({
                      ...form,
                      occupation: e.target.value,
                      occupationName: selected?.occupation_name || "",
                    });
                  }}
                >
                  <option value="">Select</option>
                  {occupations.map((o) => (
                    <option key={o.occupation_id} value={o.occupation_id}>
                      {o.occupation_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="required">Email Id</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email Id"
 />
              </div>

              <div>
                <label className="required">Aadhaar Number</label>
                <input
                  name="aadhaar"
                  value={form.aadhaar}
                  maxLength="12"
                  placeholder="Aadhaar Number"

                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, aadhaar: value });
                  }}
                />
              </div>

              <div>
                <label className="required">PAN Card Number</label>
                <input
  name="pan"
  value={form.pan}
  maxLength="10"
  disabled={!!passedPan}   // 🔒 lock PAN
  onChange={(e) => {
    const value = e.target.value.toUpperCase();
    setForm({ ...form, pan: value });
  }}
/>
              </div>

              <div>
                <label className="required">Upload PAN Card (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (validateFile(e.target.files[0], "pdf")) {
                      handleFileChange(e, "panProof");
                    }
                  }}
                />
                
{/* {uploadedFiles.panProof && (
  <small style={{ color: "green" }}>
    ✔ PAN card already uploaded
  </small>
)} */}
              </div>

              <div>
                <label className="required">Mobile Number</label>
                <input
                  name="mobile"
                  value={form.mobile}
                  maxLength="10"
                  placeholder="Mobile Number"

                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, mobile: value });
                  }}
                />
              </div>

              <div>
                <label>Land Line Number</label>
                <input
  name="landline"
  value={form.landline}
  placeholder="STD Code - Landline Number"
  maxLength="15"
  onChange={(e) => {
    const value = e.target.value.replace(/[^0-9-]/g, "");
    setForm({ ...form, landline: value });
  }}
/>

              </div>

              <div>
                <label>License Number by local bodies</label>
               <input
  name="licenseNumber"
  value={form.licenseNumber}
  placeholder="License Number by the local bodies"
  maxLength="13"
  onChange={(e) => {
    let value = e.target.value.toUpperCase();

    // allow only CAPITAL letters and numbers
    value = value.replace(/[^A-Z0-9]/g, "");

    setForm({
      ...form,
      licenseNumber: value,
    });
  }}
  onPaste={(e) => {
    let pastedText = e.clipboardData
      .getData("text")
      .toUpperCase();

    // remove symbols and small letters
    pastedText = pastedText.replace(/[^A-Z0-9]/g, "");

    e.preventDefault();

    setForm((prev) => ({
      ...prev,
      licenseNumber: pastedText,
    }));
  }}
/>
              </div>

              <div>
                <label>License Issued Date</label>
               <input
  type="date"
  name="licenseDate"
  value={form.licenseDate}
  max={new Date().toISOString().split("T")[0]}
  onChange={(e) => {
    const selectedDate = e.target.value;
    const today = new Date().toISOString().split("T")[0];

    if (selectedDate > today) {
      alert("Future dates are not allowed");
      return;
    }

    setForm({
      ...form,
      licenseDate: selectedDate,
    });
  }}
  placeholder="License Issued Date"
/>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="applicantdetails-section">
            <h3 className="applicantdetails-section-title">Local Address For Communication</h3>

            <div className="applicantdetails-grid-4">
              <div>
                <label className="required">Address Line 1</label>
                <input name="address1" value={form.address1} onChange={handleChange} placeholder="Address Line 1"
 />
              </div>

              <div>
                <label>Address Line 2</label>
                <input name="address2" value={form.address2} onChange={handleChange} placeholder="Address Line 2"
 />
              </div>

              <div>
                <label className="required">State</label>
                <select
  name="state"
  value={form.state}
  onChange={(e) => {
    setForm({
      ...form,
      state: e.target.value,
      district: "",
      mandal: "",
      village: "",
    });
  }}
>
  <option value="">Select State</option>
  {states.map((state) => (
    <option key={state.id} value={state.id}>
      {state.state_name}
    </option>
  ))}
</select>

              </div>

              <div>
                <label className="required">District</label>
                <select
  name="district"
  value={form.district}
  onChange={(e) => {
    setForm({
      ...form,
      district: e.target.value,
      mandal: "",
      village: "",
    });
  }}
  disabled={!form.state}
>
  <option value="">Select District</option>
  {districts.map((district) => (
    <option key={district.id} value={district.id}>
      {district.name}
    </option>
  ))}
</select>

              </div>

              <div>
                <label className="required">Mandal</label>
                <select
  name="mandal"
  value={form.mandal}
  onChange={(e) => {
    setForm({
      ...form,
      mandal: e.target.value,
      village: "",
    });
  }}
  disabled={!form.district}
>
  <option value="">Select Mandal</option>
  {mandals.map((mandal) => (
    <option key={mandal.id} value={mandal.id}>
      {mandal.name}
    </option>
  ))}
</select>

              </div>

              <div>
                <label className="required">Local Area / Village</label>
               <select
  name="village"
  value={form.village}
  onChange={handleChange}
  disabled={!form.mandal}
>
  <option value="">Select Village</option>
  {villages.map((village) => (
    <option key={village.id} value={village.id}>
      {village.name}
    </option>
  ))}
</select>

              </div>

              <div>
                <label className="required">PIN Code </label>
                <input
                  name="pincode"
                  value={form.pincode}
                  maxLength="6"
                  placeholder="PIN Code"

                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, pincode: value });
                  }}
                />
              </div>

              <div>
                <label className="required">Upload Address Proof (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (validateFile(e.target.files[0], "pdf")) {
                      handleFileChange(e, "addressProof");
                    }
                  }}
                />
                {/* {uploadedFiles.addressProof && (
  <small style={{ color: "green" }}>
    ✔ Address proof already uploaded
  </small>
)} */}
              </div>
            </div>
          </section>

          {/* Projects */}
         <section className="applicantdetails-section">
  <h3 className="applicantdetails-section-title">
    Projects Launched In The Past 5 Years
  </h3>

  <div className="applicantdetails-project-row">

    {/* LEFT: RADIO */}
    <div className="applicantdetails-project-radio">
      <span>Last five years project details <span style={{ color: "red" }}>*</span></span>

      <label>
       <input
  type="radio"
  checked={showProjects === true}
  onChange={() => setShowProjects(true)}
/>
        Yes
      </label>

      <label>
      <input
  type="radio"
  checked={showProjects === false}
  onChange={() => setShowProjects(false)}
/>
        No
      </label>
    </div>

    {/* INPUT */}
    {showProjects && (
      <div className="project-name-box">
        <label >Project Name <span style={{ color: "red" }}>*</span></label>
        <input 
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>
    )}

    {/* ADD BUTTON */}
    {showProjects && (
      <button
        type="button"
        className="applicantdetails-add-btn"
        onClick={handleAddProject}
      >
        Add
      </button>
    )}
  </div>

  {/* ===== TABLE BELOW (LIKE IMAGE 4) ===== */}
  {showProjects && projects.length > 0 && (
    <table className="applicantdetails-table">
      <thead>
        <tr>
          <th>S.No.</th>
          <th>Project Name</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p, index) => (
          <tr key={p.id}>
            <td>{index + 1}</td>
            <td>{p.name}</td>
            <td>
              <button
                type="button"
                className="applicantdetails-delete-btn"
                onClick={() => handleDeleteProject(p.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</section>

          {/* Litigations */}
    {/* Litigations */}
          <section className="applicantdetails-section">
            <h3 className="applicantdetails-section-title">Litigations</h3>

            <div className="applicantdetails-radio-inline applicantdetails-litigation-row">
              <span>Any Civil/Criminal Cases <span style={{ color: "red" }}>*</span> </span>

              <label>
                <input
                  type="radio"
                  name="litigation"
                  value="Yes"
                  checked={litigationStatus === "Yes"}
                  onChange={() => setLitigationStatus("Yes")}
                />{" "}
                Yes
              </label>

             <label>
                <input
                  type="radio"
                  name="litigation"
                  value="No"
                  checked={litigationStatus === "No"}
                  onChange={() => setLitigationStatus("No")}
                />{" "}
                No
              </label>

             {litigationStatus === "No" && (
  <div className="applicantdetails-litigation-affidavit">

    <div className="affidavit-text">
      <label >Self Declared Affidavit <span style={{ color: "red" }}>*</span></label>

      <p className="affidavit-note">
        Note: "A self declared affidavit (on Rs. 20 non judicial stamp paper)
        has to be uploaded if there are no cases pending, refer Form 4 in
        form downloads for proforma of this Self Affidavit."
      </p>
    </div>

    <input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={(e) =>
    setUploadedFiles({
      ...uploadedFiles,
      selfAffidavitFile: e.target.files[0],
    })
  }
/>
{/* {savedFiles.selfAffidavit && (
  <small style={{ color: "green" }}>
    ✔ Self affidavit already uploaded
  </small>
)} */}


  </div>
)}

            </div>

            {litigationStatus === "Yes" && (
              <>
                <p style={{ color: "red", marginTop: "10px" }}>
                  Note : In case Petitioner/Respondent are more than one, please provide
                  their names by comma separated.
                </p>

                <div className="applicantdetails-conditional-box applicantdetails-grid-4">
                  <div>
                    <label className="required">Case No</label>
                   <input
  name="caseNo"
  value={litigationForm.caseNo}
  maxLength="20"
  placeholder="Case No."
  onChange={(e) => {
    let value = e.target.value.toUpperCase();

    // only CAPITAL letters and numbers
    value = value.replace(/[^A-Z0-9]/g, "");

    setLitigationForm({
      ...litigationForm,
      caseNo: value,
    });
  }}
/>
                  </div>

                  <div>
                    <label className="required">Name & Place of Tribunal/Authority</label>
                  <input
  name="namePlace"
  value={litigationForm.namePlace}
  maxLength="100"
  placeholder="Name & Place of Tribunal/Authority"
  onChange={(e) => {
    let value = e.target.value;

    // allow only letters, numbers and spaces
    value = value.replace(/[^A-Za-z0-9 ]/g, "");

    setLitigationForm({
      ...litigationForm,
      namePlace: value,
    });
  }}
/>                  </div>

                  <div>
                    <label className="required">Name of the Petitioner</label>
                    <input
  name="petitioner"
  value={litigationForm.petitioner}
  maxLength="50"
  placeholder="Name of the Petitioner"
  onChange={(e) => {
    let value = e.target.value;

    // allow only alphabets and spaces
    value = value.replace(/[^A-Za-z ]/g, "");

    setLitigationForm({
      ...litigationForm,
      petitioner: value,
    });
  }}
/>
                  </div>

                  <div>
                    <label className="required">Name of the Respondent</label>
                   <input
  name="respondent"
  value={litigationForm.respondent}
  maxLength="50"
  placeholder="Name of the Respondent"
  onChange={(e) => {
    let value = e.target.value;

    // allow only alphabets and spaces
    value = value.replace(/[^A-Za-z ]/g, "");

    setLitigationForm({
      ...litigationForm,
      respondent: value,
    });
  }}
/>
                  </div>

                  <div>
                    <label className="required">Facts of the Case/Contents of the Case</label>
           <input
  name="facts"
  value={litigationForm.facts}
  maxLength="250"
  placeholder="Facts of the Case/Contents of the Case"
  onChange={(e) => {
    let value = e.target.value;

    // allow only letters, numbers and spaces
    value = value.replace(/[^A-Za-z0-9 ]/g, "");

    setLitigationForm({
      ...litigationForm,
      facts: value,
    });
  }}
/>
                  </div>

                  <div>
                    <label className="required">Present Status of the case</label>
                    <select
                     name="presentStatus"
            value={litigationForm.presentStatus}
            onChange={handleLitigationChange}
            >
                      <option>Select</option>
                      <option value="Completed">Completed</option>
                      <option value="Delay">Delay</option>
                      <option value="Under Development">Under Development</option>
                    </select>
                  </div>
<div>
  <label className="required">Interim Order if any</label>

  <div className="applicantdetails-radio-inline">
    <label>
      <input
        type="radio"
        name="interimOrder"
        value="Yes"
        checked={interimOrder === "Yes"}
        onChange={() => {
                setInterimOrder("Yes");
                setLitigationForm({ ...litigationForm, interimOrder: "Yes" });
              }}
            />{" "}
      Yes
    </label>

    <label>
      <input
        type="radio"
        name="interimOrder"
        value="No"
        checked={interimOrder === "No"}
       onChange={() => {
                setInterimOrder("No");
                setLitigationForm({ ...litigationForm, interimOrder: "No" });
              }}
            />{" "}
      No
    </label>
  </div>
</div>


{/* <div>
  <label>Details of final order if disposed *</label>

  <div className="applicantdetails-radio-inline">
    <label>
      <input
        type="radio"
        name="finalOrder"
        value="Yes"
        checked={finalOrder === "Yes"}
        onChange={() => setFinalOrder("Yes")}
      />
      Yes
    </label>

    <label>
      <input
        type="radio"
        name="finalOrder"
        value="No"
        checked={finalOrder === "No"}
        onChange={() => setFinalOrder("No")}
      />
      No
    </label>
  </div>
</div>*/}
<div> 
  <label className="required">Details of final order if disposed</label>

  <div className="applicantdetails-radio-inline">
    <label>
      <input
        type="radio"
        name="finalOrder"
        value="Yes"
        checked={finalOrder === "Yes"}
        onChange={() => {
                setFinalOrder("Yes");
                setLitigationForm({ ...litigationForm, finalOrder: "Yes" });
              }}
            />{" "}
      Yes
    </label>

    <label>
      <input
        type="radio"
        name="finalOrder"
        value="No"
        checked={finalOrder === "No"}
        onChange={() => {
                setFinalOrder("No");
                setLitigationForm({ ...litigationForm, finalOrder: "No" });
              }}
            />{" "}
            No
    </label>
  </div>
</div>



                  {/* <div>
                    <label>Details of final order if disposed *</label>
                    <label>
                      <input type="radio" /> Yes
                    </label>
                    <label>
                      <input type="radio" /> No
                    </label> 
                  </div> */}

{interimOrder === "Yes" && (
  <div>
    <label className="required">Interim Order Certificate</label>

    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(e) => {
        const file = e.target.files[0];

        if (!file) return;

        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ];

        if (!allowedTypes.includes(file.type)) {
          alert("Only PDF, JPG, JPEG, and PNG files are allowed");
          e.target.value = "";
          return;
        }

        setLitigationForm({
          ...litigationForm,
          interimCert: file,
        });
      }}
    />
  </div>
)}


{finalOrder === "Yes" && (
  <div>
    <label className="required">Disposed Certificate</label>

    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(e) => {
        const file = e.target.files[0];

        if (!file) return;

        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ];

        if (!allowedTypes.includes(file.type)) {
          alert("Only PDF, JPG, JPEG, and PNG files are allowed");
          e.target.value = "";
          return;
        }

        setLitigationForm({
          ...litigationForm,
          disposedCert: file,
        });
      }}
    />
  </div>
)}


                  <div></div>

                  <div>
                    <button
            type="button"
            className="applicantdetails-add-btn"
            onClick={handleAddLitigation}
          >
            Add
          </button>
                  </div>
                </div>
              {/* ===== TABLE ===== */}
    {litigations.length > 0 && (
  <table className="applicantdetails-table">
    <thead>
      <tr>
        <th>S.No.</th>
        <th>Case No</th>
        <th>Name & Place</th>
        <th>Petitioner</th>
        <th>Respondent</th>
        <th>Status</th>
        <th>Interim</th>
        <th>Final</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      {litigations.map((l, index) => (
        <tr key={l.id}>
          <td>{index + 1}</td>
          <td>{l.caseNo}</td>
          <td>{l.namePlace}</td>
          <td>{l.petitioner}</td>
          <td>{l.respondent}</td>
          <td>{l.presentStatus}</td>

          {/* Interim */}
          {/* Interim */}
<td>
  {l.interimOrder === "Yes" ? (
    l.interimCert ? (
      <button
        type="button"
        onClick={() => {
          const file =
            typeof l.interimCert === "string"
              ? l.interimCert
              : URL.createObjectURL(l.interimCert);

          window.open(file, "_blank");
        }}
      >
        View
      </button>
    ) : (
      "No File"
    )
  ) : (
    "No"
  )}
</td>

{/* Final */}
<td>
  {l.finalOrder === "Yes" ? (
    l.disposedCert ? (
      <button
        type="button"
        onClick={() => {
          const file =
            typeof l.disposedCert === "string"
              ? l.disposedCert
              : URL.createObjectURL(l.disposedCert);

          window.open(file, "_blank");
        }}
      >
        View
      </button>
    ) : (
      "No File"
    )
  ) : (
    "No"
  )}
</td>

          {/* Final */}
          {/* <td>
            {l.finalOrder === "Yes" && l.disposedCert ? (
              <button
                type="button"
                onClick={() => {
                  const fileUrl =
                    typeof l.disposedCert === "string"
                      ? l.disposedCert
                      : URL.createObjectURL(l.disposedCert);

                  window.open(fileUrl, "_blank");
                }}
              >
                View
              </button>
            ) : (
              "No"
            )}
          </td> */}

          {/* Delete */}
          <td>
            <button
              type="button"
              onClick={() => handleDeleteLitigation(l.id)}
            >
              Delete
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
    </>
  )}
</section>

            {/* Other State */}
   {/* ================= OTHER STATE / UT RERA ================= */}
<section className="applicantdetails-section">
  <h3 className="applicantdetails-section-title">
    Other State/UT RERA Registration Details
  </h3>

  <div className="applicantdetails-radio-inline">
  <span>Do you have registration in other states <span style={{ color: "red" }}>*</span> </span>

  <label>
    <input
      type="radio"
      name="otherStateReg"
      checked={otherStateReg === true}
      onChange={() => setOtherStateReg(true)}
    />
    Yes
  </label>

  <label>
    <input
      type="radio"
      name="otherStateReg"
      checked={otherStateReg === false}
      onChange={() => setOtherStateReg(false)}
    />
    No
  </label>
</div>


  {otherStateReg && (
    <>
      <div className="applicantdetails-grid-4 applicantdetails-conditional-box">
        <div>
          <label className="required">Registration Number</label>
          <input
            value={otherReraForm.regNo}
            placeholder="Registration Number"

            onChange={(e) =>
              setOtherReraForm({ ...otherReraForm, regNo: e.target.value })
            }
          />
        </div>

        <div>
          <label className="required">State / UT </label>
<select
  value={otherReraForm.stateId}
  onChange={(e) => {
    const selectedId = Number(e.target.value);

    const state = otherStates.find(
      (s) => s.id === selectedId
    );

    setOtherReraForm({
      ...otherReraForm,
      stateId: selectedId, // INTEGER
      stateName: state?.state_name || "", // TEXT
      districtName: "",
    });
  }}
>
  <option value="">Select</option>

  {otherStates.map((s) => (
    <option key={s.id} value={s.id}>
      {s.state_name}
    </option>
  ))}
</select>
        </div>

        {/* District */}
  <div>
    <label className="required">District</label>

    <input
      type="text"
      placeholder="Enter District"
      value={otherReraForm.districtName}
      onChange={(e) =>
        setOtherReraForm({
          ...otherReraForm,
          districtName: e.target.value,
        })
      }
    />
  </div>

        <div style={{ alignSelf: "flex-end" }}>
          <button
            type="button"
            className="applicantdetails-add-btn"
            onClick={handleAddOtherRera}
          >
            Add
          </button>
        </div>
      </div>

      {otherReraList.length > 0 && (
        <table className="applicantdetails-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Registration Number</th>
              <th>State/UT</th>
              <th>District</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {otherReraList.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.regNo}</td>
                <td>{r.stateName}</td>
                <td>{r.districtName}</td>
                <td>
                  <button
                    className="applicantdetails-delete-btn"
                    onClick={() => handleDeleteOtherRera(r.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )}
</section>


          <div className="applicantdetails-form-footer-row">
  <button
    type="button"
    className="applicantdetails-applicant-back-btn"
    onClick={() => navigate(-1)}
  >
    ← Back
  </button>
  

          {/* Save */}

          <div className="applicantdetails-btn-row">
        
          <button onClick={handleSaveContinue}>
            Save And Continue
          </button>
        </div>
         {/* ================= SUCCESS POPUP ================= */}
        {showSuccessPopup && (
          <div className="applicantdetails-success-modal-overlay">
            <div className="applicantdetails-success-modal">
              <h3>Success</h3>
              <p>Applicant Details Saved Successfully</p>
              <button
                onClick={() => {
                  setShowSuccessPopup(false);
                  navigate("/agent-upload-documents", {
                    state: {
                      agentId: localStorage.getItem("agentId"),
                    },
                  });
                }}
              >
                OK
              </button>
            </div>
        </div>
      )}
        </div>
      </div>
    </div>
    </div>
  );
}; 
export default ApplicantDetails;