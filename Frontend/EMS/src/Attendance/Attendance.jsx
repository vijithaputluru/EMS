import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import AppMonthPicker from "../components/AppMonthPicker";
import AttendanceTable from "./AttendanceTable";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./AttendanceTable.css";

const ATTENDANCE_TABS = [
  "All",
  "Present",
  "Late",
  "Absent",
  "Half Day",
  "On Leave"
];

const getInitialAttendanceState = (searchString) => {
  const params = new URLSearchParams(searchString);

  const status = String(
    params.get("status") || ""
  )
    .trim()
    .toLowerCase();

  if (status === "present") {
    return {
      viewMode: "daily",
      filter: "Present",
    };
  }

  if (status === "absent") {
    return {
      viewMode: "daily",
      filter: "Absent",
    };
  }

  return {
    viewMode: "monthly",
    filter: "All",
  };
};

function Attendance() {

  const location = useLocation();

  const [viewMode, setViewMode] = useState(
    () =>
      String(getInitialAttendanceState(location.search).viewMode)
        .trim()
        .toLowerCase()
  );

  const [filter, setFilter] = useState(
    () => getInitialAttendanceState(location.search).filter
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  // Optimization: keep date boundaries stable instead of recreating them on every keystroke render.
  const today = useMemo(() => new Date(), []);

  const [month, setMonth] = useState(
    today.getMonth() + 1
  );

  const [year, setYear] = useState(
    today.getFullYear()
  );

  // ================= URL FILTER HANDLING =================

  useEffect(() => {

    if (!location.search) {
      return;
    }

    const nextState =
      getInitialAttendanceState(
        location.search
      );

    const nextViewMode =
      String(nextState.viewMode)
        .trim()
        .toLowerCase();

    // Optimization: avoid no-op state updates that would rerender the full attendance table.
    setViewMode((currentViewMode) =>
      currentViewMode === nextViewMode ? currentViewMode : nextViewMode
    );

    setFilter((currentFilter) =>
      currentFilter === nextState.filter ? currentFilter : nextState.filter
    );

  }, [location.search]);

  return (

    <div className="attendance-page">

      {/* ================= HEADER ================= */}

      <div className="attendance-header">

        <div>

          <h2>
            Attendance
          </h2>

          <p className="attendance-subtitle">
            Monitoring employees
          </p>

        </div>

        <div className="attendance-top-controls">

          {/* ================= VIEW SELECT ================= */}

          <select
            className="attendance-select"
            value={String(viewMode)
              .trim()
              .toLowerCase()}
            onChange={(e) =>
              setViewMode(
                String(e.target.value)
                  .trim()
                  .toLowerCase()
              )
            }
          >

            <option value="daily">
              Daily
            </option>

            <option value="monthly">
              Monthly
            </option>

          </select>

          {/* ================= MONTH PICKER ================= */}

          {String(viewMode)
            .trim()
            .toLowerCase() === "monthly" && (

              <AppMonthPicker
                month={month}
                year={year}
                onMonthChange={setMonth}
                onYearChange={setYear}
                minYear={2020}
                maxYear={today.getFullYear() + 2}
                disabled={false}
              />

            )}

        </div>

      </div>

      {/* ================= TOOLBAR ================= */}

      <div className="attendance-toolbar">

        <input
          className="attendance-search"
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <div className="attendance-filters">

          {ATTENDANCE_TABS.map((tab) => (

            <button
              key={tab}
              className={
                filter === tab
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(tab)
              }
            >
              {tab}
            </button>

          ))}

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <AttendanceTable
        viewMode={String(viewMode)
          .trim()
          .toLowerCase()}
        filter={filter}
        search={debouncedSearch}
        month={month}
        year={year}
      />

    </div>
  );
}

// Optimization: memoize the page wrapper so parent route renders do not redraw the table unnecessarily.
export default React.memo(Attendance);
