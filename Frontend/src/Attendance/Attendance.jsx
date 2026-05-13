import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppMonthPicker from "../components/AppMonthPicker";
import AttendanceTable from "./AttendanceTable";
import "./AttendanceTable.css";

const getInitialAttendanceState = (searchString) => {
  const params = new URLSearchParams(searchString);
  const status = String(params.get("status") || "").toLowerCase();

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
  const initialState = getInitialAttendanceState(location.search);

  const [viewMode, setViewMode] = useState(initialState.viewMode);
  const [filter, setFilter] = useState(initialState.filter);
  const [search, setSearch] = useState("");

  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const tabs = [
    "All",
    "Present",
    "Late",
    "Absent",
    "Half Day",
    "On Leave"
  ];

  // ================= URL FILTER HANDLING =================

  useEffect(() => {
    if (!location.search) {
      return;
    }

    const nextState = getInitialAttendanceState(location.search);
    setViewMode(nextState.viewMode);
    setFilter(nextState.filter);
  }, [location.search]);

  // ================= MONTH CHANGE =================

  return (

    <div className="attendance-page">

      <div className="attendance-header">

        <div>
          <h2>Attendance</h2>

          <p className="attendance-subtitle">
            Monitoring employees
          </p>
        </div>

        <div className="attendance-top-controls">

          <select
            className="attendance-select"
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value)
            }
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>

          {viewMode === "monthly" && (
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

          {tabs.map((tab) => (

            <button
              key={tab}
              className={
                filter === tab ? "active" : ""
              }
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>

          ))}

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <AttendanceTable
        viewMode={viewMode}
        filter={filter}
        search={search}
        month={month}
        year={year}
      />

    </div>
  );
}

export default Attendance;
