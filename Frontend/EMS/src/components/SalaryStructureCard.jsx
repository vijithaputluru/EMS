import React from "react";
import "./SalaryStructureCard.css";
import {
  SALARY_MAX,
  SALARY_MIN,
  formatCurrency,
} from "../utils/salaryStructure";

function SalaryStructureCard({
  idPrefix,
  ctcValue,
  disabled = false,
  onCtcChange,
  sliderRef = null,
}) {
  const sliderProgress =
    ((ctcValue - SALARY_MIN) /
      (SALARY_MAX - SALARY_MIN)) *
    100;

  return (
    <div className="salary-structure-card">

      {/* TITLE */}
      <div className="salary-structure-slider-head">
        <div>
          <p className="salary-structure-slider-title">
            Salary Range
          </p>

          <p className="salary-structure-slider-note">
            Use slider or + / - buttons to change salary.
          </p>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="salary-structure-ctc-controls">

        {/* MINUS */}
        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() =>
            onCtcChange(
              Math.max(
                SALARY_MIN,
                Number(ctcValue) - 10000
              )
            )
          }
          disabled={disabled}
        >
          -
        </button>

        {/* VALUE */}
        <div className="salary-ctc-value">
          {formatCurrency(ctcValue)}
        </div>

        {/* PLUS */}
        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() =>
            onCtcChange(
              Math.min(
                SALARY_MAX,
                Number(ctcValue) + 10000
              )
            )
          }
          disabled={disabled}
        >
          +
        </button>
      </div>

      {/* RANGE */}
      <input
        id={`${idPrefix}-ctc-slider`}
        ref={sliderRef}
        type="range"
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={10000}
        value={ctcValue}
        onChange={(event) =>
          onCtcChange(Number(event.target.value))
        }
        disabled={disabled}
        className="salary-structure-slider"
        style={{
          "--range-progress": `${sliderProgress}%`,
        }}
      />
    </div>
  );
}

export default SalaryStructureCard;