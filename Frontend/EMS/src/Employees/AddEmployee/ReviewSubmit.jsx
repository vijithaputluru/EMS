import React from "react";
import { formatDate } from "../../utils/date";
import "./AddEmployee.css";

const getDisplayValue = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || fallback;
};

const getFullName = (personalInfo) =>
  [
    personalInfo?.firstName,
    personalInfo?.middleName,
    personalInfo?.lastName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

const getAddress = (personalInfo) =>
  [
    personalInfo?.houseNo,
    personalInfo?.street,
    personalInfo?.city,
    personalInfo?.district,
    personalInfo?.state,
    personalInfo?.country,
    personalInfo?.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

function ReviewField({ label, value }) {
  return (
    <div className="review-item">
      <span className="review-label">{label}</span>
      <span className="review-value">{getDisplayValue(value)}</span>
    </div>
  );
}

function ReviewSection({
  title,
  stepNumber,
  onEditSection,
  children,
}) {
  return (
    <div className="form-card review-section-card">
      <div className="review-section-header">
        <h4>{title}</h4>

        <button
          type="button"
          className="btn secondary review-edit-btn"
          onClick={() => onEditSection(stepNumber)}
        >
          Edit
        </button>
      </div>

      {children}
    </div>
  );
}

function ReviewSubmit({
  data,
  viewMode,
  submitting,
  successMsg,
  errorMsg,
  onBack,
  onEditSection,
  onFinalSubmit,
}) {
  const personalInfo = data?.personalInfo || {};
  const bankDetails = data?.bankDetails || {};
  const education = Array.isArray(data?.education) ? data.education : [];
  const experience = Array.isArray(data?.experience) ? data.experience : [];

  return (
    <div className="form-section">
      <h3>Review & Submit</h3>
      <p className="review-intro">
        Review the saved employee details below before final submission.
      </p>

      <ReviewSection
        title="Personal Information"
        stepNumber={1}
        onEditSection={onEditSection}
      >
        <div className="review-item-grid">
          <ReviewField label="Employee ID" value={personalInfo.employee_Id} />
          <ReviewField label="Full Name" value={getFullName(personalInfo)} />
          <ReviewField label="Date of Birth" value={formatDate(personalInfo.dateOfBirth)} />
          <ReviewField label="Gender" value={personalInfo.gender} />
          <ReviewField label="Marital Status" value={personalInfo.marital_Status} />
          <ReviewField label="Phone Number" value={personalInfo.phoneNumber} />
          <ReviewField label="Email" value={personalInfo.email} />
          <ReviewField label="Aadhaar Number" value={personalInfo.aadhaarNumber} />
          <ReviewField label="PAN Number" value={personalInfo.panNumber} />
          <ReviewField label="Department" value={personalInfo.department} />
          <ReviewField label="Designation" value={personalInfo.designation} />
          <ReviewField label="Date of Joining" value={formatDate(personalInfo.joiningDate)} />
          <ReviewField label="Experience (Years)" value={personalInfo.workExperience} />
          <ReviewField label="Blood Group" value={personalInfo.bloodGroup} />
          <div className="review-item review-item-full">
            <span className="review-label">Address</span>
            <span className="review-value">{getDisplayValue(getAddress(personalInfo))}</span>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection
        title="Bank Information"
        stepNumber={2}
        onEditSection={onEditSection}
      >
        <div className="review-item-grid">
          <ReviewField label="Customer ID" value={bankDetails.customer_Id} />
          <ReviewField label="Bank Name" value={bankDetails.bank_Name} />
          <ReviewField label="Account Holder Name" value={bankDetails.account_Holder_Name} />
          <ReviewField label="Account Number" value={bankDetails.account_Number} />
          <ReviewField label="IFSC Code" value={bankDetails.ifsC_Code} />
          <ReviewField label="Branch Name" value={bankDetails.branch_Name} />
          <ReviewField label="UAN Number" value={bankDetails.uaN_Number} />
          <ReviewField label="PF Account Number" value={bankDetails.pF_Account_Number} />
        </div>
      </ReviewSection>

      <ReviewSection
        title="Education"
        stepNumber={3}
        onEditSection={onEditSection}
      >
        {education.length > 0 ? (
          <div className="review-stack">
            {education.map((item, index) => (
              <div className="review-list-card" key={`${item.degree || "education"}-${index}`}>
                <div className="review-section-subtitle">Education {index + 1}</div>

                <div className="review-item-grid">
                  <ReviewField label="Qualification" value={item.degree} />
                  <ReviewField label="Institution" value={item.universityBoard} />
                  <ReviewField label="Year" value={item.yearOfPassing} />
                  <ReviewField label="Percentage" value={item.percentageCGPA} />
                  <div className="review-item review-item-full">
                    <span className="review-label">Specialization</span>
                    <span className="review-value">{getDisplayValue(item.specialization)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty-state">No education details added.</div>
        )}
      </ReviewSection>

      <ReviewSection
        title="Experience"
        stepNumber={4}
        onEditSection={onEditSection}
      >
        {experience.length > 0 ? (
          <div className="review-stack">
            {experience.map((item, index) => (
              <div
                className="review-list-card"
                key={`${item.companyName || "experience"}-${index}`}
              >
                <div className="review-section-subtitle">Experience {index + 1}</div>

                <div className="review-item-grid">
                  <ReviewField label="Company Name" value={item.companyName} />
                  <ReviewField label="Designation" value={item.designation} />
                  <ReviewField label="From Date" value={formatDate(item.fromDate)} />
                  <ReviewField label="To Date" value={formatDate(item.toDate)} />
                  <ReviewField label="Years of Experience" value={item.years} />
                  <ReviewField label="Reason for Leaving" value={item.reasonForLeaving} />
                  <div className="review-item review-item-full">
                    <span className="review-label">Description</span>
                    <span className="review-value">{getDisplayValue(item.description)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="review-empty-state">No experience details added.</div>
        )}
      </ReviewSection>

      <div className="step-actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>

        {successMsg && <p className="education-feedback success">{successMsg}</p>}
        {errorMsg && <p className="education-feedback error">{errorMsg}</p>}

        {!viewMode && (
          <button
            type="button"
            className="btn primary"
            onClick={onFinalSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Final Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewSubmit;
