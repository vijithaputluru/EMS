import React from "react";

const steps = [
  {
    id: 1,
    label: "Personal Info",
  },
  {
    id: 2,
    label: "Bank Info",
  },
  {
    id: 3,
    label: "Education",
  },
  {
    id: 4,
    label: "Experience",
  },
  {
    id: 5,
    label: "Review",
  },
];

function Stepper({ step, setStep, maxStep }) {
  const handleStepClick = (targetStep) => {
    if (targetStep <= maxStep) {
      setStep(targetStep);
    }
  };

  return (
    <div className="stepper">
      {steps.map((item) => (
        <div
          key={item.id}
          className={`step ${step === item.id ? "active" : ""} ${maxStep < item.id ? "disabled" : ""}`.trim()}
          onClick={() => handleStepClick(item.id)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

export default Stepper;
