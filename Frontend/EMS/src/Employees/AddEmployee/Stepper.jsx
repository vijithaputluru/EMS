import React from "react";

function Stepper({ step, setStep, maxStep }) {

  const handleStepClick = (targetStep) => {
    if (targetStep <= maxStep) {
      setStep(targetStep);
    }
  };

  return (
    <div className="stepper">

      <div
        className={`step ${step === 1 ? "active" : ""}`}
        onClick={() => handleStepClick(1)}
      >
        Personal Info
      </div>

      <div
        className={`step ${step === 2 ? "active" : ""} ${maxStep < 2 ? "disabled" : ""}`}
        onClick={() => handleStepClick(2)}
      >
        Bank Info
      </div>

      <div
        className={`step ${step === 3 ? "active" : ""} ${maxStep < 3 ? "disabled" : ""}`}
        onClick={() => handleStepClick(3)}
      >
        Education
      </div>

      <div
        className={`step ${step === 4 ? "active" : ""} ${maxStep < 4 ? "disabled" : ""}`}
        onClick={() => handleStepClick(4)}
      >
        Experience
      </div>

    </div>
  );
}

export default Stepper;