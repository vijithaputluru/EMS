import React from "react";
import "./SalaryStructureCard.css";
import {
  SALARY_BREAKUP_FIELDS,
  SALARY_MAX,
  SALARY_MIN,
  SALARY_STEP,
  formatCurrency,
  formatLpa,
  formatNumberInput,
} from "../utils/salaryStructure";

const SALARY_SCALE_MARKERS = [
  { label: "1L", value: SALARY_MIN },
  { label: "5L", value: 500000 },
  { label: "10L", value: 1000000 },
  { label: "20L", value: 2000000 },
  { label: "30L", value: 3000000 },
  { label: "40L", value: 4000000 },
  { label: "50L", value: SALARY_MAX },
];

function SalaryStructureCard({
  idPrefix,
  ctcValue,
  salaryBreakup,
  manualSalaryFields,
  salaryErrors = {},
  isSyncingSalary = false,
  disabled = false,
  onCtcChange,
  onBreakupFieldChange,
  onResetBreakup,
  helperText,
  sliderRef = null,
  variant = "detailed",
}) {
  const sliderProgress =
    ((ctcValue - SALARY_MIN) / (SALARY_MAX - SALARY_MIN)) * 100;
  const totalBreakupValue = salaryBreakup?.totalCtc || ctcValue;
  const isCompact = variant === "compact";

  return (
    <div
      className={`salary-structure-card ${
        isCompact ? "salary-structure-compact" : "salary-structure-detailed"
      }`}
    >
      <div className="salary-structure-topline">
        <div>
          <p className="salary-structure-kicker">
            {isCompact ? "Annual Compensation" : "Annual Salary Structure"}
          </p>
          <p className="salary-structure-caption">
            {helperText ||
              (isCompact
                ? "Select the annual CTC and the system will calculate the breakup automatically."
                : "Auto defaults come from the backend when available. You can still edit any breakup value manually.")}
          </p>
        </div>

        {!isCompact && onResetBreakup ? (
          <button
            type="button"
            className="salary-structure-reset"
            onClick={onResetBreakup}
            disabled={disabled}
          >
            Reset Auto
          </button>
        ) : isSyncingSalary ? (
          <span className="salary-structure-sync-pill">Syncing defaults...</span>
        ) : null}
      </div>

      <div className="salary-structure-summary">
        <div className="salary-structure-stat primary">
          <span className="salary-structure-stat-label">Current Salary</span>
          <strong>{formatCurrency(ctcValue)}</strong>
          <span className="salary-structure-stat-meta">{formatLpa(ctcValue)}</span>
        </div>

        <div className="salary-structure-stat">
          <span className="salary-structure-stat-label">Total Breakup</span>
          <strong>{formatCurrency(totalBreakupValue)}</strong>
          <span className="salary-structure-stat-meta">
            {formatLpa(totalBreakupValue)}
          </span>
        </div>
      </div>

      <div
        className={`salary-structure-slider-panel ${
          salaryErrors.total ? "input-error" : ""
        }`}
      >
        <div className="salary-structure-slider-head">
          <div>
            <p className="salary-structure-slider-title">Salary Range</p>
            <p className="salary-structure-slider-note">
              {isCompact
                ? "Move the slider to set annual CTC and generate the full salary breakup automatically."
                : "Move the slider to set annual CTC. You can fine-tune the breakup below if needed."}
            </p>
          </div>

          {!isCompact && isSyncingSalary && (
            <span className="salary-structure-sync-pill">Syncing defaults...</span>
          )}
        </div>

        <input
          id={`${idPrefix}-ctc-slider`}
          ref={sliderRef}
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={SALARY_STEP}
          value={ctcValue}
          onChange={(event) => onCtcChange(event.target.value)}
          disabled={disabled}
          className="salary-structure-slider"
          style={{ "--range-progress": `${sliderProgress}%` }}
        />

        <div className="salary-structure-scale" aria-hidden="true">
          {SALARY_SCALE_MARKERS.map(({ label, value }) => {
            const position =
              ((value - SALARY_MIN) / (SALARY_MAX - SALARY_MIN)) * 100;
            const edgeClass =
              value === SALARY_MIN
                ? "start"
                : value === SALARY_MAX
                  ? "end"
                  : "";

            return (
              <span
                key={label}
                className={`salary-structure-scale-label ${edgeClass}`}
                style={{ "--marker-position": `${position}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {!isCompact && (
        <>
          <div className="salary-breakup-grid">
            {SALARY_BREAKUP_FIELDS.map(({ name, label }) => (
              <div className="salary-breakup-field" key={name}>
                <div className="salary-breakup-label-row">
                  <label htmlFor={`${idPrefix}-${name}`}>{label}</label>
                  <span
                    className={`salary-breakup-badge ${
                      manualSalaryFields?.[name] ? "manual" : "auto"
                    }`}
                  >
                    {manualSalaryFields?.[name] ? "Manual" : "Auto"}
                  </span>
                </div>

                <div className="salary-breakup-input-wrap currency-input">
                  <span className="salary-breakup-prefix currency-symbol">
                    {"\u20B9"}
                  </span>
                  <input
                    id={`${idPrefix}-${name}`}
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(salaryBreakup?.[name])}
                    onChange={(event) =>
                      onBreakupFieldChange(name, event.target.value)
                    }
                    disabled={disabled}
                    className={`currency-field ${
                      salaryErrors[name] ? "input-error" : ""
                    }`}
                  />
                </div>

                {salaryErrors[name] && (
                  <p className="salary-breakup-error">{salaryErrors[name]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="salary-breakup-footer">
            <div>
              <p className="salary-breakup-total-label">Total Breakup</p>
              <strong className="salary-breakup-total-value">
                {formatCurrency(totalBreakupValue)}
              </strong>
            </div>

            <div className="salary-breakup-footer-meta">
              <span className="salary-breakup-total-lpa">
                {formatLpa(totalBreakupValue)}
              </span>
            </div>
          </div>
        </>
      )}

      {salaryErrors.total && (
        <p className="salary-breakup-error salary-breakup-total-error">
          {salaryErrors.total}
        </p>
      )}
    </div>
  );
}

export default SalaryStructureCard;
