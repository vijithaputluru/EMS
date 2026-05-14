import React from "react";
import DatePicker from "react-datepicker";
import { getInputDateValue, parseDate } from "../utils/date";

function AppDatePicker({
  id,
  name,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  disabled = false,
  className = "",
  wrapperClassName = "",
  ariaDescribedBy,
  ariaInvalid = false,
  dateFormat = "dd/MM/yyyy",
}) {
  const selectedDate = parseDate(value);
  const minimumDate = parseDate(minDate);
  const maximumDate = parseDate(maxDate);

  return (
    <DatePicker
      id={id}
      name={name}
      selected={selectedDate}
      onChange={(date) => {
        const nextValue = getInputDateValue(date);

        if (typeof onChange === "function") {
          onChange({
            target: {
              name,
              value: nextValue,
            },
          });
        }
      }}
      minDate={minimumDate || undefined}
      maxDate={maximumDate || undefined}
      placeholderText={placeholder}
      dateFormat={dateFormat}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      yearDropdownItemNumber={100}
      autoComplete="off"
      className={`app-date-input ${className}`.trim()}
      wrapperClassName={`app-date-input-wrapper ${wrapperClassName}`.trim()}
      calendarClassName="app-date-calendar"
      disabled={disabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      fixedHeight
      popperPlacement="bottom-start"
      shouldCloseOnSelect
    />
  );
}

export default AppDatePicker;
