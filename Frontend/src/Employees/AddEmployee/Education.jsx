import React, { useState, useEffect } from "react";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";

function Education({ onNext, onBack, employeeId, viewMode, data }) {
  const currentYear = new Date().getFullYear();

  // ✅ NEW: Degree dropdown options
  const degreeOptions = [
    "10th (SSC)",
    "Intermediate (12th)",
    "Diploma",
    "B.Tech / BE",
    "B.Sc",
    "BCA",
    "M.Tech / ME",
    "M.Sc",
    "MCA",
    "PhD",
    "Other"
  ];

  const [educations, setEducations] = useState([
    {
      Graduation: "",
      university: "",
      year: "",
      percentage: "",
      specialization: "",
    },
  ]);

  const [errors, setErrors] = useState([]);
  const [serverErrors, setServerErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const mapped = data.map((edu) => ({
      Graduation: edu.degree || "",
      university: edu.universityBoard || "",
      year: edu.yearOfPassing ? String(edu.yearOfPassing) : "",
      percentage:
        edu.percentageCGPA !== undefined && edu.percentageCGPA !== null
          ? String(edu.percentageCGPA)
          : "",
      specialization: edu.specialization || "",
    }));

    setEducations(mapped);
  }, [data]);

  const handleChange = (index, field, value) => {
    const updated = [...educations];
    updated[index][field] = value;
    setEducations(updated);

    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleYearChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 4) return;
    handleChange(index, "year", value);
  };

  const handlePercentageChange = (index, value) => {
    if (!/^\d*\.?\d*$/.test(value)) return;
    handleChange(index, "percentage", value);
  };

  const addEducation = () => {
    setEducations([
      ...educations,
      {
        Graduation: "",
        university: "",
        year: "",
        percentage: "",
        specialization: "",
      },
    ]);
  };

  const removeEducation = async (index) => {
    if (educations.length <= 1) return;

    const updatedList = educations.filter((_, i) => i !== index);
    setEducations(updatedList);
    setErrors([]);

    const isEditMode = data && data.length > 0;

    if (isEditMode && employeeId) {
      try {
        const payload = updatedList.map((edu) => {
          const yearNum = edu.year ? parseInt(edu.year, 10) : 0;
          const pctStr = edu.percentage ? edu.percentage.replace("%", "").trim() : "0";

          return {
            Employee_Id: String(employeeId),
            Degree: edu.Graduation?.trim() || "",
            UniversityBoard: edu.university?.trim() || "",
            YearOfPassing: isNaN(yearNum) ? 0 : yearNum,
            PercentageCGPA: pctStr,
            Specialization: edu.specialization?.trim() || "",
          };
        });

        await api.put(
          API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId),
          payload,
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("❌ Remove Error:", error);
        alert("Failed to delete record from server.");
      }
    }
  };

  const validate = () => {
    let newErrors = [];
    let isValid = true;

    educations.forEach((edu, index) => {
      let error = {};

      if (!edu.Graduation?.trim()) {
        error.Graduation = "Graduation required";
        isValid = false;
      }

      if (!edu.university?.trim()) {
        error.university = "University required";
        isValid = false;
      }

      if (!edu.year || !/^\d{4}$/.test(edu.year)) {
        error.year = "Valid year required";
        isValid = false;
      }

      if (!edu.percentage) {
        error.percentage = "Percentage required";
        isValid = false;
      }

      if (!edu.specialization?.trim()) {
        error.specialization = "Specialization required";
        isValid = false;
      }

      newErrors[index] = error;
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSaveNext = async () => {
    setServerErrors({});
    setSuccessMsg("");
    setApiError("");
    if (!validate()) return;

    if (!employeeId) {
      alert("Employee ID missing");
      return;
    }

    setLoading(true);

    try {
      const payloadList = educations.map((edu) => ({
        Employee_Id: String(employeeId),
        Degree: edu.Graduation?.trim() || "",
        UniversityBoard: edu.university?.trim() || "",
        YearOfPassing: parseInt(edu.year, 10),
        PercentageCGPA: edu.percentage,
        Specialization: edu.specialization?.trim() || "",
      }));

      const isEditMode = data && data.length > 0;

      if (isEditMode) {
        await api.put(
          API_ENDPOINTS.employeeEducation.byEmployeeId(employeeId),
          payloadList,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        await Promise.all(
          payloadList.map((payload) =>
            api.post(API_ENDPOINTS.employeeEducation.list, payload, {
              headers: {
                "Content-Type": "application/json",
              },
            })
          )
        );
      }

      setSuccessMsg(
        isEditMode
          ? "Education updated successfully!"
          : "Education saved successfully!"
      );
      setTimeout(() => onNext(), 800);
    } catch (error) {
      console.error("Save failed", error);
      setApiError("Failed to save education details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">
      <h3>Add Educational Qualifications</h3>

      {educations.map((edu, index) => (
        <div className="form-card" key={index}>
          <div className="form-grid">

            {/* ✅ UPDATED DEGREE FIELD */}
            <div className="form-group">
              <label>Graduation</label>

              <select
                value={
                  degreeOptions.includes(edu.Graduation)
                    ? edu.Graduation
                    : edu.Graduation
                      ? "Other"
                      : ""
                }
                onChange={(e) =>
                  handleChange(index, "Graduation", e.target.value)
                }
                disabled={viewMode}
              >
                <option value="">Select Degree</option>
                {degreeOptions.map((deg) => (
                  <option key={deg} value={deg}>
                    {deg}
                  </option>
                ))}
              </select>

              {/* ✅ SHOW INPUT IF OTHER */}
              {edu.Graduation &&
                !degreeOptions.includes(edu.Graduation) && (
                  <input
                    type="text"
                    placeholder="Enter your degree"
                    value={edu.Graduation}
                    onChange={(e) =>
                      handleChange(index, "Graduation", e.target.value)
                    }
                    disabled={viewMode}
                    style={{ marginTop: "8px" }}
                  />
                )}
            </div>

            {/* KEEP REST SAME */}
            <div className="form-group">
              <label>University</label>
              <input
                value={edu.university}
                onChange={(e) =>
                  handleChange(index, "university", e.target.value)
                }
                disabled={viewMode}
              />
            </div>

            <div className="form-group">
              <label>Year</label>
              <input
                value={edu.year}
                onChange={(e) => handleYearChange(index, e.target.value)}
                disabled={viewMode}
              />
            </div>

            <div className="form-group">
              <label>Percentage</label>
              <input
                value={edu.percentage}
                onChange={(e) =>
                  handlePercentageChange(index, e.target.value)
                }
                disabled={viewMode}
              />
            </div>

            <div className="form-group full">
              <label>Specialization</label>
              <input
                value={edu.specialization}
                onChange={(e) =>
                  handleChange(index, "specialization", e.target.value)
                }
                disabled={viewMode}
              />
            </div>
          </div>
        </div>
      ))}

      {!viewMode && (
        <div className="education-add-wrapper">
          <button
            type="button"
            className="add-education-btn"
            onClick={addEducation}
          >
            + Add Education
          </button>
        </div>
      )}

      <div className="step-actions">
        <button
          className="btn secondary"
          onClick={onBack}
          disabled={loading}
        >
          Back
        </button>

        {successMsg && (
          <p className="education-feedback success">{successMsg}</p>
        )}

        {apiError && (
          <p className="education-feedback error">{apiError}</p>
        )}

        {!viewMode && (
          <>
            <button
              className="btn primary"
              onClick={handleSaveNext}
              disabled={loading}
            >
              {loading
                ? data && data.length > 0
                  ? "Updating..."
                  : "Saving..."
                : data && data.length > 0
                  ? "Update & Next"
                  : "Save & Next"}
            </button>
          </>
        )}
      </div>

    </div>
  );
}

export default Education;
