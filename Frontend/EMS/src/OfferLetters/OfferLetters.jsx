import React, { useState, useEffect, useRef } from "react";
import "./OfferLetters.css";
import {
  FaFileAlt,
  FaDownload,
  FaUser,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBriefcase,
  FaRupeeSign,
  FaCalendarAlt,
} from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppDatePicker from "../components/AppDatePicker";
import { sortByNewestIdFirst } from "../utils/collections";
import { isValidEmail } from "../utils/validation";

function OfferLetters() {
  const [formData, setFormData] = useState({
    candidate_Name: "",
    email: "",
    address: "",
    position: "",
    joining_Date: "",
    ctc_Annual: "",
    basic: "",
    hra: "",
    conveyance: "",
    medicalAllowance: "",
    otherAllowance: "",
  });

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState({});

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const lettersPerPage = 50;

  const indexOfLast = currentPage * lettersPerPage;
  const indexOfFirst = indexOfLast - lettersPerPage;
  const currentLetters = letters.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(letters.length / lettersPerPage);

  /* ================= REFS ================= */
  const fieldRefs = {
    candidate_Name: useRef(null),
    email: useRef(null),
    address: useRef(null),
    position: useRef(null),
    joining_Date: useRef(null),
    ctc_Annual: useRef(null),
    basic: useRef(null),
    hra: useRef(null),
    conveyance: useRef(null),
    medicalAllowance: useRef(null),
    otherAllowance: useRef(null),
  };

  /* ================= SCROLL FUNCTION ================= */
  const scrollToField = (fieldName) => {
    const ref = fieldRefs[fieldName];

    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      ref.current.focus();
    }
  };

  /* ================= TOKEN ================= */
  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  };

  /* ================= HANDLE INPUT ================= */
  const handleChange = async (e) => {
    const { name, value } = e.target;

    // remove error while typing
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    /* ================= CTC AUTO CALCULATION ================= */
    if (name === "ctc_Annual") {
      const numericValue = value.replace(/\D/g, "");
      const annualCTC = Number(numericValue);

      const handleChange = async (e) => {
        const { name, value } = e.target;

        // remove error while typing
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));

        /* ================= CTC AUTO CALCULATION ================= */
        if (name === "ctc_Annual") {

          // existing ctc code here

          return;
        }

        /* ================= FORMAT SALARY INPUTS ================= */
        if (
          [
            "basic",
            "hra",
            "conveyance",
            "medicalAllowance",
            "otherAllowance",
          ].includes(name)
        ) {

          // existing salary code here

          return;
        }

        /* ================= ADD VALIDATIONS HERE ================= */

        /* ================= CANDIDATE NAME ================= */
        if (name === "candidate_Name") {

          let filteredValue = value.replace(/^\s+/g, "");

          filteredValue = filteredValue.replace(
            /[^A-Za-z0-9 ]/g,
            ""
          );

          const numbers =
            filteredValue.match(/\d/g);

          if (numbers && numbers.length > 1) {
            return;
          }

          filteredValue = filteredValue.replace(
            /\s{2,}/g,
            " "
          );

          if (filteredValue.length > 50) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= EMAIL ================= */
        if (name === "email") {

          let filteredValue =
            value.replace(/\s/g, "");

          if (filteredValue.length > 100) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= ADDRESS ================= */
        if (name === "address") {

          let filteredValue =
            value.replace(/^\s+/g, "");

          filteredValue = filteredValue.replace(
            /\s{2,}/g,
            " "
          );

          if (filteredValue.length > 250) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= POSITION ================= */
        if (name === "position") {

          let filteredValue =
            value.replace(/^\s+/g, "");

          filteredValue = filteredValue.replace(
            /[^A-Za-z ]/g,
            ""
          );

          filteredValue = filteredValue.replace(
            /\s{2,}/g,
            " "
          );

          if (filteredValue.length > 50) {
            return;
          }

          setFormData((prev) => ({
            ...prev,
            [name]: filteredValue,
          }));

          return;
        }

        /* ================= NORMAL INPUTS ================= */
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      };

      setFormData((prev) => ({
        ...prev,
        ctc_Annual: new Intl.NumberFormat("en-IN").format(annualCTC),
      }));

      if (!annualCTC || annualCTC <= 0) return;

      try {
        const response = await api.get(
          `/OfferLetter/salary-structure/${annualCTC}`
        );

        const data = response.data;

        setFormData((prev) => ({
          ...prev,

          ctc_Annual: new Intl.NumberFormat("en-IN").format(
            annualCTC
          ),

          basic: new Intl.NumberFormat("en-IN").format(
            data.basic || 0
          ),

          hra: new Intl.NumberFormat("en-IN").format(
            data.hra || 0
          ),

          conveyance: new Intl.NumberFormat("en-IN").format(
            data.conveyance || 0
          ),

          medicalAllowance: new Intl.NumberFormat("en-IN").format(
            data.medicalAllowance || 0
          ),

          otherAllowance: new Intl.NumberFormat("en-IN").format(
            data.otherAllowance || 0
          ),
        }));
      } catch (error) {
        console.error("Salary Structure API Error =>", error);
      }

      return;
    }

    /* ================= FORMAT SALARY INPUTS ================= */
    if (
      [
        "basic",
        "hra",
        "conveyance",
        "medicalAllowance",
        "otherAllowance",
      ].includes(name)
    ) {
      const numericValue = value.replace(/\D/g, "");

      setFormData((prev) => ({
        ...prev,
        [name]: new Intl.NumberFormat("en-IN").format(
          numericValue
        ),
      }));

      return;
    }

    /* ================= NORMAL INPUTS ================= */
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ================= FETCH OFFER LETTERS ================= */
  const fetchOfferLetters = async () => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
        return;
      }

      const res = await api.get(
        API_ENDPOINTS.offerLetters.all,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = Array.isArray(res.data) ? res.data : [];

      setLetters(sortByNewestIdFirst(data, (letter) => letter.id));

      const newTotalPages =
        Math.ceil(data.length / lettersPerPage) || 1;

      if (currentPage > newTotalPages) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch offer letters");
    }
  };

  useEffect(() => {
    fetchOfferLetters();
  }, []);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    let newErrors = {};

    // Candidate Name
    if (!formData.candidate_Name.trim()) {
      newErrors.candidate_Name =
        "Candidate name is required";

      setErrors(newErrors);
      scrollToField("candidate_Name");
      return false;
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";

      setErrors(newErrors);
      scrollToField("email");
      return false;
    }

    if (!isValidEmail(formData.email)) {
      newErrors.email = "Enter valid email address";

      setErrors(newErrors);
      scrollToField("email");
      return false;
    }

    // Address
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";

      setErrors(newErrors);
      scrollToField("address");
      return false;
    }

    // Position
    if (!formData.position.trim()) {
      newErrors.position = "Position is required";

      setErrors(newErrors);
      scrollToField("position");
      return false;
    }

    // CTC
    if (!formData.ctc_Annual.trim()) {
      newErrors.ctc_Annual =
        "Annual CTC is required";

      setErrors(newErrors);
      scrollToField("ctc_Annual");
      return false;
    }

    // Joining Date
    if (!formData.joining_Date) {
      newErrors.joining_Date =
        "Joining date is required";

      setErrors(newErrors);
      scrollToField("joining_Date");
      return false;
    }

    // Basic
    if (!formData.basic?.trim()) {
      newErrors.basic = "Basic salary is required";

      setErrors(newErrors);
      scrollToField("basic");
      return false;
    }

    // HRA
    if (!formData.hra?.trim()) {
      newErrors.hra = "HRA is required";

      setErrors(newErrors);
      scrollToField("hra");
      return false;
    }

    // Conveyance
    if (!formData.conveyance?.trim()) {
      newErrors.conveyance =
        "Conveyance is required";

      setErrors(newErrors);
      scrollToField("conveyance");
      return false;
    }

    // Medical Allowance
    if (!formData.medicalAllowance?.trim()) {
      newErrors.medicalAllowance =
        "Medical allowance is required";

      setErrors(newErrors);
      scrollToField("medicalAllowance");
      return false;
    }

    // Other Allowance
    if (!formData.otherAllowance?.trim()) {
      newErrors.otherAllowance =
        "Other allowance is required";

      setErrors(newErrors);
      scrollToField("otherAllowance");
      return false;
    }

    setErrors({});
    return true;
  };

  /* ================= GENERATE OFFER LETTER ================= */
  const handleGenerate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      const payload = {
        candidate_Name:
          formData.candidate_Name.trim(),

        email: formData.email.trim(),

        address: formData.address.trim(),

        position: formData.position.trim(),

        joining_Date: formData.joining_Date,

        ctc_Annual: Number(
          formData.ctc_Annual.replace(/,/g, "")
        ),

        basic: Number(
          formData.basic.replace(/,/g, "")
        ),

        hra: Number(
          formData.hra.replace(/,/g, "")
        ),

        conveyance: Number(
          formData.conveyance.replace(/,/g, "")
        ),

        medicalAllowance: Number(
          formData.medicalAllowance.replace(/,/g, "")
        ),

        otherAllowance: Number(
          formData.otherAllowance.replace(/,/g, "")
        ),
      };

      await api.post(
        API_ENDPOINTS.offerLetters.generate,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        "Offer Letter Generated Successfully"
      );

      setFormData({
        candidate_Name: "",
        email: "",
        address: "",
        position: "",
        joining_Date: "",
        ctc_Annual: "",
        basic: "",
        hra: "",
        conveyance: "",
        medicalAllowance: "",
        otherAllowance: "",
      });

      setErrors({});

      fetchOfferLetters();
    } catch (error) {
      console.error("Generate Error:", error);

      if (error.response?.status === 401) {
        toast.error(
          "Unauthorized. Please login again."
        );

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      } else {
        toast.error(
          "Failed to generate offer letter"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= DOWNLOAD LETTER ================= */
  const handleDownload = async (id) => {
    try {
      const token = getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);

        return;
      }

      setDownloadingId(id);

      const response = await api.get(
        API_ENDPOINTS.offerLetters.download(id),
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const file = new Blob([response.data], {
        type: "application/pdf",
      });

      const url =
        window.URL.createObjectURL(file);

      const link = document.createElement("a");

      link.href = url;
      link.download = `OfferLetter_${id}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Offer Letter Downloaded");
    } catch (error) {
      console.error("Download Error:", error);
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="offer-container">
      <ToastContainer
        position="top-right"
        autoClose={2500}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          marginBottom: "8px",
          paddingBottom: "0px",
          marginTop: "-15px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "26px",
            fontWeight: "650",
            // color: "#141e35",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaFileAlt />
          Offer Letter Generation
        </h2>

        <p
          style={{
            marginTop: "0px",
            marginLeft: "42px",
            fontSize: "15px",
            color: "#64748b",
            fontWeight: "500",
          }}
        >
          Generate offer letters for new hires
        </p>
      </div>

      <div className="offer-card">
        <h3>Generate New Offer Letter</h3>

        <div className="form-grid">

          {/* Candidate Name */}
          <div className="form-group">
            <label>
              <FaUser /> Candidate Name
            </label>

            <input
              ref={fieldRefs.candidate_Name}
              type="text"
              name="candidate_Name"
              value={formData.candidate_Name}
              onChange={handleChange}
              placeholder="Enter candidate name"
            />

            <p
              style={{
                color: "red",
                fontSize: "12px",
                marginTop: "3px",
                minHeight: "16px",
              }}
            >
              {errors.candidate_Name || ""}
            </p>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>
              <FaEnvelope /> Email
            </label>

            <input
              ref={fieldRefs.email}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
            />

            <p
              style={{
                color: "red",
                fontSize: "12px",
                marginTop: "3px",
                minHeight: "16px",
              }}
            >
              {errors.email || ""}
            </p>
          </div>

          {/* Address */}
          <div className="form-group full-width">
            <label>
              <FaMapMarkerAlt /> Address
            </label>

            <textarea
              ref={fieldRefs.address}
              name="address"
              rows="4"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
            />

            {errors.address && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.address || ""}
              </p>
            )}
          </div>

          {/* Position */}
          <div className="form-group">
            <label>
              <FaBriefcase /> Position
            </label>

            <input
              ref={fieldRefs.position}
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder="Enter position"
            />

            {errors.position && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.position || ""}
              </p>
            )}
          </div>

          {/* Annual CTC */}
          <div className="form-group">
            <label>
              <FaRupeeSign /> Annual CTC
            </label>

            <input
              ref={fieldRefs.ctc_Annual}
              type="text"
              name="ctc_Annual"
              className="no-spinner"
              value={formData.ctc_Annual}
              onChange={handleChange}
              placeholder="Enter annual CTC"
              inputMode="numeric"
              onKeyDown={(e) => {
                if (
                  ["e", "E", "+", "-", "."].includes(
                    e.key
                  )
                ) {
                  e.preventDefault();
                }
              }}
            />

            {errors.ctc_Annual && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.ctc_Annual || ""}
              </p>
            )}
          </div>

          {/* Joining Date */}
          <div className="form-group" ref={fieldRefs.joining_Date}>
            <label>
              <FaCalendarAlt /> Joining Date
            </label>

            <AppDatePicker
              name="joining_Date"
              value={formData.joining_Date}
              onChange={handleChange}
            />

            {errors.joining_Date && (
              <p
                style={{
                  color: "red",
                  fontSize: "12px",
                  marginTop: "3px",
                  minHeight: "16px",
                }}
              >
                {errors.joining_Date || ""}
              </p>
            )}
          </div>

          {/* Compensation Section */}
          <div className="full-width compensation-container">

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 className="compensation-title">
                Compensation and Benefits Structure
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsEditMode(!isEditMode)
                }
                style={{
                  background: isEditMode
                    ? "#dc2626"
                    : "#111827",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {isEditMode
                  ? "Cancel Edit"
                  : "Edit"}
              </button>
            </div>

            <div className="compensation-box">

              {/* Basic */}
              <div className="comp-row">
                <div className="comp-label">
                  Basic
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.basic}
                    type="text"
                    name="basic"
                    value={formData.basic}
                    onChange={handleChange}
                    placeholder="Enter Basic"
                    disabled={!isEditMode}
                  />

                  {errors.basic && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.basic || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* HRA */}
              <div className="comp-row">
                <div className="comp-label">
                  HRA
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.hra}
                    type="text"
                    name="hra"
                    value={formData.hra}
                    onChange={handleChange}
                    placeholder="Enter HRA"
                    disabled={!isEditMode}
                  />

                  {errors.hra && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.hra || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Conveyance */}
              <div className="comp-row">
                <div className="comp-label">
                  Conveyance
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.conveyance}
                    type="text"
                    name="conveyance"
                    value={formData.conveyance}
                    onChange={handleChange}
                    placeholder="Enter Conveyance"
                    disabled={!isEditMode}
                  />

                  {errors.conveyance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.conveyance || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Medical */}
              <div className="comp-row">
                <div className="comp-label">
                  Medical Allowance
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.medicalAllowance}
                    type="text"
                    name="medicalAllowance"
                    value={formData.medicalAllowance}
                    onChange={handleChange}
                    placeholder="Enter Medical Allowance"
                    disabled={!isEditMode}
                  />

                  {errors.medicalAllowance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.medicalAllowance || ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Other */}
              <div className="comp-row">
                <div className="comp-label">
                  Oth. Allowances
                </div>

                <div className="comp-input">
                  <input
                    ref={fieldRefs.otherAllowance}
                    type="text"
                    name="otherAllowance"
                    value={formData.otherAllowance}
                    onChange={handleChange}
                    placeholder="Enter Other Allowances"
                    disabled={!isEditMode}
                  />

                  {errors.otherAllowance && (
                    <p
                      style={{
                        color: "red",
                        fontSize: "12px",
                        marginTop: "3px",
                        minHeight: "16px",
                      }}
                    >
                      {errors.otherAllowance || ""}
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="offer-buttons">
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            <FaFileAlt />

            {loading
              ? " Generating..."
              : " Generate Letter"}
          </button>
        </div>
      </div>

      {/* OFFER LIST */}
      <div className="offer-list">
        <h3>
          <FaFileAlt /> Generated Offer Letters
        </h3>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>

                <th>
                  <FaUser /> Candidate
                </th>

                <th>
                  <FaEnvelope /> Email
                </th>

                <th>
                  <FaBriefcase /> Position
                </th>

                <th>
                  <FaDownload /> Download
                </th>
              </tr>
            </thead>

            <tbody>
              {currentLetters.length > 0 ? (
                currentLetters.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>

                    <td>
                      {item.candidate_Name}
                    </td>

                    <td>{item.email}</td>

                    <td>{item.position}</td>

                    <td>
                      <button
                        className="download-btn"
                        onClick={() =>
                          handleDownload(item.id)
                        }
                        disabled={
                          downloadingId === item.id
                        }
                      >
                        <FaDownload />

                        {downloadingId === item.id
                          ? " Downloading..."
                          : " Download"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                    }}
                  >
                    No offer letters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="assets-pagination">

            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((prev) => prev - 1)
              }
            >
              Prev
            </button>

            {[...Array(totalPages)].map(
              (_, i) => (
                <button
                  key={i}
                  className={
                    currentPage === i + 1
                      ? "active-page"
                      : ""
                  }
                  onClick={() =>
                    setCurrentPage(i + 1)
                  }
                >
                  {i + 1}
                </button>
              )
            )}

            <button
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setCurrentPage((prev) => prev + 1)
              }
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfferLetters;
