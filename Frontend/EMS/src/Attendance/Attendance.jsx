import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppMonthPicker from "../components/AppMonthPicker";
import AttendanceTable from "./AttendanceTable";
import "./AttendanceTable.css";

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

  const initialState =
    getInitialAttendanceState(
      location.search
    );

  const [viewMode, setViewMode] = useState(
    String(initialState.viewMode)
      .trim()
      .toLowerCase()
  );

  const [filter, setFilter] = useState(
    initialState.filter
  );

  const [search, setSearch] = useState("");

  const today = new Date();

  const [month, setMonth] = useState(
    today.getMonth() + 1
  );

  const [year, setYear] = useState(
    today.getFullYear()
  );

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

    const nextState =
      getInitialAttendanceState(
        location.search
      );

    setViewMode(
      String(nextState.viewMode)
        .trim()
        .toLowerCase()
    );

    setFilter(nextState.filter);

  }, [location.search]);

  // ================= DEBUG =================

  console.log("VIEW MODE:", viewMode);
  console.log("MONTH:", month);
  console.log("YEAR:", year);

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

          {tabs.map((tab) => (

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
        search={search}
        month={month}
        year={year}
      />

    </div>
  );
}

export default Attendance;