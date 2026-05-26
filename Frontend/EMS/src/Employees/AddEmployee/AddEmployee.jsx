import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS, buildApiUrl } from "../../api/endpoints";
import { getStoredToken } from "../../utils/authStorage";

import Stepper from "./Stepper";

import PersonalInfo from "./PersonalInfo";
import BankInfo from "./BankInfo";
import Education from "./Education";
import Experience from "./Experience";
import "./AddEmployee.css";

function AddEmployee() {

  const { id } = useParams();

  const viewMode = Boolean(id);

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);

  const [employeeId, setEmployeeId] = useState(id || "");
  const [employeeData, setEmployeeData] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [noDataMessage, setNoDataMessage] = useState("");

  const bankRef = useRef();

  // ================= FETCH EMPLOYEE =================

  useEffect(() => {

    const fetchEmployeeDetails = async () => {

      try {

        setLoading(true);

        const token = getStoredToken();

        const config = {
          headers: {
            "ngrok-skip-browser-warning": "true",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
        };

        let res;

        if (id) {

          res = await api.get(
            API_ENDPOINTS.employeeFullDetail.byId(id),
            config
          );

        } else {

          res = await api.get(
            API_ENDPOINTS.employeeFullDetail.myDetails,
            config
          );

        }

        const employee = res.data || {};

        setEmployeeData(employee);

        // ✅ SET EMPLOYEE ID
        if (employee?.employeeId) {

          setEmployeeId(employee.employeeId);

        } else if (employee?.id) {

          setEmployeeId(employee.id);

        }

        // ✅ CHECK EMPTY DATA
        const hasData =
          employee?.personalInfo ||
          employee?.bankDetails ||
          employee?.education?.length > 0 ||
          employee?.experience?.length > 0;

        if (!hasData) {

          setNoDataMessage(
            "Employee has not filled profile details yet."
          );

        } else {

          setNoDataMessage("");

        }

      } catch (err) {

        console.error(
          "Employee fetch error:",
          err
        );

        setNoDataMessage(
          "Unable to load employee details."
        );

      } finally {

        setLoading(false);

      }

    };

    fetchEmployeeDetails();

  }, [id]);

  // ================= ADMIN STEP ACCESS =================

  useEffect(() => {

    if (viewMode) {

      setMaxStep(4);

    }

  }, [viewMode]);

  // ================= NEXT HANDLERS =================

  const nextFromPersonal = (empId) => {

    setEmployeeId(empId);

    setStep(2);

    setMaxStep((prev) =>
      Math.max(prev, 2)
    );

  };

  const nextFromBank = () => {

    if (bankRef.current?.validate?.()) {

      setStep(3);

      setMaxStep((prev) =>
        Math.max(prev, 3)
      );

    }

  };

  const nextFromEducation = () => {

    setStep(4);

    setMaxStep((prev) =>
      Math.max(prev, 4)
    );

  };

  // ================= EDIT TOGGLE =================

  const handleEditToggle = () => {

    setIsEditing((prev) => !prev);

  };

  // ================= LOADER =================

  if (loading) {

    return (

      <div className="employee-loader-container">

        <div className="employee-loader"></div>

        <p>
          Loading employee details...
        </p>

      </div>

    );

  }

  return (

    <div className="add-employee">

      <div className="page-header-row">

        <div>

          <h2 className="page-title">

            {viewMode
              ? "Employee Details"
              : "My Profile"}

          </h2>

          <p className="page-subtitle">

            {viewMode
              ? "Admin can navigate all steps directly"
              : isEditing
                ? "You can now edit your profile details"
                : "Complete your profile step by step"}

          </p>

          {/* ✅ EMPTY MESSAGE */}

          {noDataMessage && (

            <div className="employee-empty-message">

              {noDataMessage}

            </div>

          )}

        </div>

        <button
          className="edit-profile-btn"
          onClick={handleEditToggle}
        >
          {isEditing
            ? "Cancel Edit"
            : "Edit"}
        </button>

      </div>

      {/* ✅ STEPPER */}

      <Stepper
        step={step}
        setStep={setStep}
        maxStep={viewMode ? 4 : maxStep}
      />

      {/* ================= STEP CONTENT ================= */}

      <div className="step-content">

        {step === 1 && (

          <PersonalInfo
            onNext={nextFromPersonal}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.personalInfo || null}
            selfProfile={!id}
            updateUrl={buildApiUrl(
              API_ENDPOINTS.employeeFullDetail.myDetails
            )}
          />

        )}

        {step === 2 && (

          <BankInfo
            ref={bankRef}
            onBack={() => setStep(1)}
            onNext={nextFromBank}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.bankDetails || null}
            selfProfile={!id}
            updateUrl={buildApiUrl(
              API_ENDPOINTS.employeeFullDetail.myDetails
            )}
          />

        )}

        {step === 3 && (

          <Education
            onBack={() => setStep(2)}
            onNext={nextFromEducation}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.education || []}
            selfProfile={!id}
            updateUrl={buildApiUrl(
              API_ENDPOINTS.employeeFullDetail.myDetails
            )}
          />

        )}

        {step === 4 && (

          <Experience
            onBack={() => setStep(3)}
            onNext={() => setStep(1)}
            employeeId={employeeId}
            viewMode={!isEditing}
            data={employeeData?.experience || []}
            selfProfile={!id}
            updateUrl={buildApiUrl(
              API_ENDPOINTS.employeeFullDetail.myDetails
            )}
          />

        )}

      </div>

    </div>

  );

}

export default AddEmployee;