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
  const parsedCtcValue = Number(ctcValue);
  const currentValue = Number.isFinite(parsedCtcValue)
    ? parsedCtcValue
    : SALARY_MIN;
 
  // SLIDER PROGRESS
  const sliderProgress = Math.max(
    0,
    Math.min(
      100,
      ((currentValue - SALARY_MIN) /
        (SALARY_MAX - SALARY_MIN)) *
      100
    )
  );
 
  // COMMON UPDATE FUNCTION
  const updateSalary = (amount) => {
    if (typeof onCtcChange === "function") {
      onCtcChange((previousValue) => {
        const safePreviousValue = Number.isFinite(Number(previousValue))
          ? Number(previousValue)
          : SALARY_MIN;
        const updatedValue =
          safePreviousValue +
          Number(amount);
 
        return Math.max(
          SALARY_MIN,
          Math.min(SALARY_MAX, updatedValue)
        );
      });
    }
  };
 
  return (
    <div className="salary-structure-card">
 
      {/* TITLE */}
      <div className="salary-structure-slider-head">
        <div>
          <p className="salary-structure-slider-title">
            Salary Range
          </p>
 
          <p className="salary-structure-slider-note">
            Use slider or quick buttons to change salary.
          </p>
        </div>
      </div>
 
      {/* MAIN CONTROLS */}
      <div className="salary-structure-ctc-controls">
 
        {/* MINUS 10K */}
        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() => updateSalary(-10000)}
          disabled={disabled}
        >
          -10K
        </button>
 
        {/* VALUE */}
        <div className="salary-ctc-value">
          {formatCurrency(currentValue)}
        </div>
 
        {/* PLUS 10K */}
        <button
          type="button"
          className="salary-ctc-btn"
          onClick={() => updateSalary(10000)}
          disabled={disabled}
        >
          +10K
        </button>
      </div>
 
      {/* QUICK BUTTONS */}
      <div className="salary-quick-buttons">
 
        {/* 1000 */}
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-1000)}
          disabled={disabled}
        >
          -1000
        </button>
 
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(1000)}
          disabled={disabled}
        >
          +1000
        </button>
 
        {/* 100 */}
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-100)}
          disabled={disabled}
        >
          -100
        </button>
 
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(100)}
          disabled={disabled}
        >
          +100
        </button>
 
        {/* 1 */}
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(-1)}
          disabled={disabled}
        >
          -1
        </button>
 
        <button
          type="button"
          className="salary-small-btn"
          onClick={() => updateSalary(1)}
          disabled={disabled}
        >
          +1
        </button>
 
      </div>
 
      {/* RANGE SLIDER */}
      <input
        id={`${idPrefix}-ctc-slider`}
        ref={sliderRef}
        type="range"
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={1}
        value={currentValue}
        onChange={(event) =>
          onCtcChange(
            Number(event.target.value)
          )
        }
        disabled={disabled}
        className="salary-structure-slider"
        style={{
          "--range-progress": `${sliderProgress}%`,
        }}
      />
 
      {/* MIN / MAX LABELS */}
      <div className="salary-slider-labels">
        <span>
          {formatCurrency(SALARY_MIN)}
        </span>
 
        <span>
          {formatCurrency(SALARY_MAX)}
        </span>
      </div>
 
    </div>
  );
}
 
export default SalaryStructureCard;
 
 