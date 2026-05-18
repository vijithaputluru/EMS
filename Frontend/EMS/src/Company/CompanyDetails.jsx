import React, { useEffect, useState } from "react";
import "./CompanyDetails.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import AppDatePicker from "../components/AppDatePicker";
import { extractCollection } from "../utils/collections";
import { formatDate, toIsoDateString } from "../utils/date";
import { isValidEmail } from "../utils/validation";

const COMPANY_ID = 1;

const EMPTY_BRANCH = {
  name: "",
  established: "",
  phone: "",
  email: "",
};

const formatDisplayDate = (value) => {
  return formatDate(value);
};

function CompanyDetails() {
  const [modalType, setModalType] = useState(null);
  const [showBranchPopup, setShowBranchPopup] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchEditIndex, setBranchEditIndex] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchErrors, setBranchErrors] = useState({});
  const [companyErrors, setCompanyErrors] = useState({});
  const [companySaving, setCompanySaving] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);

  const [company, setCompany] = useState({
    name: "",
    established: "",
    phone: "",
    email: "",
    gst: "",
    tin: "",
    pan: "",
    branches: 0,
  });

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(EMPTY_BRANCH);

  const fetchCompany = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.getById(COMPANY_ID));
      const data = res.data || {};

      setCompany({
        name: data.companyName || "",
        established: data.establishedDate?.split("T")[0] || "",
        phone: String(data.phoneNumber || "").replace(/\D/g, "").slice(0, 10),
        email: data.emailAddress || "",
        gst: data.gstNumber || "",
        tin: data.tinNumber || "",
        pan: data.panNumber || "",
        branches: 0,
      });
    } catch (error) {
      console.error("Company fetch error:", error);
      toast.error("Failed to load company details.");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.branches.list);
      const mappedBranches = extractCollection(res.data).map((branchItem) => ({
        id: branchItem.id,
        name: branchItem.branchName || "",
        established: branchItem.established ? branchItem.established.split("T")[0] : "",
        phone: String(branchItem.phoneNumber || "").replace(/\D/g, "").slice(0, 10),
        email: branchItem.email || "",
      }));

      setBranches(mappedBranches);
      setCompany((prev) => ({
        ...prev,
        branches: mappedBranches.length,
      }));
    } catch (error) {
      console.error("Branches fetch error:", error);
      toast.error("Failed to load branches.");
    }
  };

  useEffect(() => {
    fetchCompany();
    fetchBranches();
  }, []);

  const handleCompanyChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    switch (name) {
      case "phone":
        nextValue = value.replace(/\D/g, "").slice(0, 10);
        break;

      case "gst":
        nextValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
        break;

      case "pan":
        nextValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        break;

      case "tin":
        nextValue = value.replace(/\D/g, "").slice(0, 11);
        break;

      case "name":
        nextValue = value.replace(/\s{2,}/g, " ").slice(0, 80);
        break;

      default:
        break;
    }

    setCompany((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setCompanyErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

const handleBranchChange = (event) => {
  const { name, value } = event.target;

  let nextValue = value;

  switch (name) {

    // BRANCH NAME -> only alphabets + max 25 chars
    case "name":
      nextValue = value
        .replace(/[^A-Za-z\s]/g, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, 25);
      break;

    // PHONE -> only 10 digits
    case "phone":
      nextValue = value.replace(/\D/g, "").slice(0, 10);
      break;

    // EMAIL -> max 40 chars
    case "email":
      nextValue = value.slice(0, 40);
      break;

    default:
      break;
  }

  setBranch((prev) => ({
    ...prev,
    [name]: nextValue,
  }));

  setBranchErrors((prev) => ({
    ...prev,
    [name]: "",
  }));
};

  const validateCompany = () => {
    const errors = {};

    // COMPANY NAME
    if (!company.name.trim()) {
      errors.name = "Company Name is required";
    } else if (!/^[A-Za-z0-9\s&.,()-]{2,30}$/.test(company.name.trim())) {
      errors.name =
        "Company Name should contain valid characters only";
    }

    // ESTABLISHED DATE
    if (!company.established.trim()) {
      errors.established = "Established Date is required";
    } else {
      const selectedDate = new Date(company.established);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        errors.established =
          "Future dates are not allowed";
      }
    }

    // PHONE
    if (!company.phone.trim()) {
      errors.phone = "Phone Number is required";
    } else if (!/^[6-9]\d{9}$/.test(company.phone)) {
      errors.phone =
        "Enter valid 10-digit mobile number";
    }

    // EMAIL
    if (!company.email.trim()) {
      errors.email = "Email Address is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
        company.email
      )
    ) {
      errors.email = "Enter valid email address";
    } else if (company.email.length > 40) {
      errors.email =
        "Email Address should not exceed 40 characters";
    }

    // GST
   if (!company.gst.trim()) {
  errors.gst = "GST Number is required";
} else if (
  !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(
    company.gst
  )
) {
  errors.gst =
    "Enter valid GST Number (Example: 36ABCDE1234F1Z5)";
}
    // PAN
    if (!company.pan.trim()) {
      errors.pan = "PAN Number is required";
    } else if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(company.pan)
    ) {
      errors.pan = "Enter valid PAN Number";
    }

    // TIN
    if (!company.tin.trim()) {
      errors.tin = "TIN Number is required";
    } else if (!/^\d{9,11}$/.test(company.tin)) {
      errors.tin =
        "TIN Number should be 9 to 11 digits";
    }

    setCompanyErrors(errors);

    return Object.keys(errors).length === 0;
  };

const validateBranch = () => {
  const errors = {};

  // BRANCH NAME
  if (!branch.name.trim()) {
    errors.name = "Branch Name is required";
  } else if (branch.name.trim().length > 25) {
    errors.name = "Branch Name cannot exceed 25 characters";
  } else if (!/^[A-Za-z\s]+$/.test(branch.name.trim())) {
    errors.name = "Branch Name must contain only alphabets";
  }

  // ESTABLISHED DATE
  if (!branch.established.trim()) {
    errors.established = "Established Date is required";
  } else {
    const selectedDate = new Date(branch.established);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      errors.established = "Future dates are not allowed";
    }
  }

  // PHONE
  if (!branch.phone.trim()) {
    errors.phone = "Phone Number is required";
  } else if (!/^\d{10}$/.test(branch.phone)) {
    errors.phone = "Phone Number must contain exactly 10 digits";
  }

  // EMAIL
  if (!branch.email.trim()) {
    errors.email = "Email Address is required";
  } else if (branch.email.length > 40) {
    errors.email = "Email should not exceed 40 characters";
  } else if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(branch.email)) {
    errors.email = "Email must end with @gmail.com";
  }

  setBranchErrors(errors);

  return Object.keys(errors).length === 0;
};

  const handleAddBranch = async () => {
    if (!validateBranch()) return;

    try {
      setBranchSaving(true);

      const payload = {
        branchName: branch.name.trim().replace(/\s+/g, " "),
        established: toIsoDateString(branch.established),
        phoneNumber: branch.phone.trim(),
        email: branch.email.trim(),
      };

      if (branchEditIndex !== null) {
        await api.put(
          API_ENDPOINTS.company.branches.byId(branches[branchEditIndex].id),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        await api.post(API_ENDPOINTS.company.branches.list, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      toast.success(branchEditIndex !== null ? "Branch updated successfully." : "Branch added successfully.");
      setBranch(EMPTY_BRANCH);
      setBranchErrors({});
      setBranchEditIndex(null);
      setModalType(null);
      await fetchBranches();
    } catch (error) {
      console.error("Branch Save Error:", error.response?.data || error.message);
      toast.error("Unable to save branch.");
    } finally {
      setBranchSaving(false);
    }
  };

  const openBranchPopup = (branchItem) => {
    setSelectedBranch(branchItem);
    setShowBranchPopup(true);
  };

  const handleBranchEdit = () => {
    if (!selectedBranch) return;

    const index = branches.findIndex((branchItem) => branchItem.id === selectedBranch.id);
    setBranch(selectedBranch);
    setBranchEditIndex(index);
    setBranchErrors({});
    setShowBranchPopup(false);
    setModalType("branch");
  };

  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;

    try {
      await api.delete(API_ENDPOINTS.company.branches.byId(selectedBranch.id));

      const updatedBranches = branches.filter((branchItem) => branchItem.id !== selectedBranch.id);
      setBranches(updatedBranches);
      setCompany((prev) => ({
        ...prev,
        branches: updatedBranches.length,
      }));

      setShowDeleteModal(false);
      setSelectedBranch(null);
      toast.success("Branch deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error.response?.data || error.message);
      toast.error("Unable to delete branch.");
    }
  };

  const updateCompany = async () => {
    if (!validateCompany()) return;

    try {
      setCompanySaving(true);

      const payload = {
        companyName: company.name.trim().replace(/\s+/g, " "),
        establishedDate: toIsoDateString(company.established),
        phoneNumber: company.phone.trim(),
        emailAddress: company.email.trim(),
        gstNumber: company.gst.trim(),
        tinNumber: company.tin.trim(),
        panNumber: company.pan.trim(),
        branches: branches.length,
        branchList: [],
      };

      await api.put(API_ENDPOINTS.company.update(COMPANY_ID), payload);
      setModalType(null);
      toast.success("Company details updated successfully.");
      await fetchCompany();
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      toast.error("Unable to update company details.");
    } finally {
      setCompanySaving(false);
    }
  };

  return (
    <div className="company-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="company-card">
        <div className="company-header">
          <div>
            <h2>{company.name || "Company"}</h2>
            <p>Established: {formatDisplayDate(company.established)}</p>
          </div>

          <button className="edit-btn" onClick={() => setModalType("company")}>
            Edit Details
          </button>
        </div>

        <div className="company-info">
          <div className="info-box">📞 {company.phone || "-"}</div>
          <div className="info-box">✉️ {company.email || "-"}</div>
          <div className="info-box">GST: {company.gst || "-"}</div>
          <div className="info-box">TIN: {company.tin || "-"}</div>
          <div className="info-box">PAN: {company.pan || "-"}</div>
          <div className="info-box">Branches: {branches.length}</div>
        </div>
      </div>

      <div className="branch-header">
        <h3>Branches</h3>
        <button
          className="company-add-btn"
          onClick={() => {
            setBranch(EMPTY_BRANCH);
            setBranchErrors({});
            setBranchEditIndex(null);
            setModalType("branch");
          }}
        >
          + Add Branch
        </button>
      </div>

      <table className="branch-table">
        <thead>
          <tr>
            <th>Branch Name</th>
            <th>Established</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {branches.map((branchItem, index) => (
            <tr key={index} className="branch-row-click" onClick={() => openBranchPopup(branchItem)}>
              <td>{branchItem.name}</td>
              <td>{formatDisplayDate(branchItem.established)}</td>
              <td>{branchItem.phone}</td>
              <td>{branchItem.email}</td>

              <td>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="company-edit-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedBranch(branchItem);
                      setBranch(branchItem);
                      setBranchEditIndex(index);
                      setModalType("branch");
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="company-delete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedBranch(branchItem);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showDeleteModal && (
        <div
          className="company-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(3px)",
            zIndex: 99999
          }}
        >
          <div className="company-modal-box small">
            <h3>Confirm Delete</h3>

            <p style={{ marginTop: "10px" }}>
              Are you sure you want to delete this branch?
            </p>

            <div className="company-modal-btns">
              <button className="company-cancel-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>

              <button className="company-delete-btn" onClick={handleDeleteBranch}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showBranchPopup && selectedBranch && (
        <div className="company-modal-overlay">
          <div className="company-modal-box small">
            <h3>Branch Details</h3>

            <div className="branch-details">
              <p><strong>Name :</strong> {selectedBranch.name}</p>
              <p><strong>Established :</strong> {formatDisplayDate(selectedBranch.established)}</p>
              <p><strong>Phone :</strong> {selectedBranch.phone}</p>
              <p><strong>Email :</strong> {selectedBranch.email}</p>
            </div>

            <div className="company-modal-btns">
              <button className="company-edit-btn" onClick={handleBranchEdit}>
                Edit
              </button>

              <button className="company-delete-btn" onClick={() => setShowDeleteModal(true)}>
                Delete
              </button>

              <button className="company-cancel-btn" onClick={() => setShowBranchPopup(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "company" && (
        <div className="company-modal-overlay">
          <div
            className="company-modal-box"
            style={{
              position: "relative",
              margin: "auto"
            }}
          >
            <h3>Edit Company Details</h3>

            <div className="form-two-column">
              <div className="form-column">
                <div className="form-group">
                  <label>Company Name</label>
                  <input name="name" value={company.name} onChange={handleCompanyChange} className={companyErrors.name ? "input-error" : ""} />
                  {companyErrors.name && <span className="error">{companyErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input name="phone" value={company.phone} onChange={handleCompanyChange} className={companyErrors.phone ? "input-error" : ""} />
                  {companyErrors.phone && <span className="error">{companyErrors.phone}</span>}
                </div>

                <div className="form-group">
                  <label>GST Number</label>
                  <input name="gst" value={company.gst} onChange={handleCompanyChange} className={companyErrors.gst ? "input-error" : ""} />
                  {companyErrors.gst && <span className="error">{companyErrors.gst}</span>}
                </div>

                <div className="form-group">
                  <label>PAN Number</label>
                  <input name="pan" value={company.pan} onChange={handleCompanyChange} className={companyErrors.pan ? "input-error" : ""} />
                  {companyErrors.pan && <span className="error">{companyErrors.pan}</span>}
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <label>Established Date</label>
                  <AppDatePicker name="established" value={company.established} onChange={handleCompanyChange} className={companyErrors.established ? "input-error" : ""} />
                  {companyErrors.established && <span className="error">{companyErrors.established}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input name="email" value={company.email} onChange={handleCompanyChange} className={companyErrors.email ? "input-error" : ""} />
                  {companyErrors.email && <span className="error">{companyErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label>TIN Number</label>
                  <input name="tin" value={company.tin} onChange={handleCompanyChange} className={companyErrors.tin ? "input-error" : ""} />
                  {companyErrors.tin && <span className="error">{companyErrors.tin}</span>}
                </div>
              </div>
            </div>

            <div className="company-modal-btns">
              <button className="company-cancel-btn" onClick={() => setModalType(null)} disabled={companySaving}>
                Cancel
              </button>

              <button className="company-save-btn" onClick={updateCompany} disabled={companySaving}>
                {companySaving ? "Updating..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "branch" && (
        <div className="company-modal-overlay">
          <div className="company-modal-box">
            <h3>{branchEditIndex !== null ? "Edit Branch Details" : "Add Branch Details"}</h3>

            <div className="form-group">
              <label>Branch Name</label>
              <input name="name" value={branch.name} onChange={handleBranchChange} className={branchErrors.name ? "input-error" : ""} />
              {branchErrors.name && <span className="error">{branchErrors.name}</span>}
            </div>

            <div className="form-group">
              <label>Established Date</label>
              <AppDatePicker name="established" value={branch.established} onChange={handleBranchChange} className={branchErrors.established ? "input-error" : ""} />
              {branchErrors.established && <span className="error">{branchErrors.established}</span>}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" value={branch.phone} onChange={handleBranchChange} className={branchErrors.phone ? "input-error" : ""} />
              {branchErrors.phone && <span className="error">{branchErrors.phone}</span>}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input name="email" value={branch.email} onChange={handleBranchChange} className={branchErrors.email ? "input-error" : ""} />
              {branchErrors.email && <span className="error">{branchErrors.email}</span>}
            </div>

            <div className="company-modal-btns">
              <button className="company-cancel-btn" onClick={() => setModalType(null)} disabled={branchSaving}>
                Cancel
              </button>
              <button className="company-save-btn" onClick={handleAddBranch} disabled={branchSaving}>
                {branchSaving
                  ? branchEditIndex !== null
                    ? "Updating..."
                    : "Saving..."
                  : branchEditIndex !== null
                    ? "Update"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyDetails;

