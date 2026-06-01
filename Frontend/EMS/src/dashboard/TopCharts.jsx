import React, { memo } from "react";
import {
  FaUsers,
  FaBuilding,
  FaProjectDiagram,
  FaCalendarCheck,
} from "react-icons/fa";

function TopCharts({ data = {} }) {
  return (
    <div className="cards">

      {/* Total Employees */}
      <div className="card">
        <div className="card-top">
          <div>
            <p className="card-label">Total Employees</p>
            <h2 className="card-value">{data?.totalEmployees || 0}</h2>
            <span className="card-change green">
               Total
            </span>
          </div>
          <div className="icon green">
            <FaUsers />
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="card">
        <div className="card-top">
          <div>
            <p className="card-label">Departments</p>
            <h2 className="card-value">{data?.totalDepartments || 0}</h2>
            <span className="card-change">
              Active
            </span>
          </div>
          <div className="icon blue">
            <FaBuilding />
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="card">
        <div className="card-top">
          <div>
            <p className="card-label">Active Projects</p>
            <h2 className="card-value">{data?.activeProjects || 0}</h2>
            <span className="card-change">
              Running
            </span>
          </div>
          <div className="icon orange">
            <FaProjectDiagram />
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div className="card">
        <div className="card-top">
          <div>
            <p className="card-label">Attendance Today</p>
            <h2 className="card-value">{data?.attendancePercentage || 0}%</h2>
            <span className="card-change green">
              Today
            </span>
          </div>
          <div className="icon teal">
            <FaCalendarCheck />
          </div>
        </div>
      </div>

    </div>
  );
}

// Optimization: memoized dashboard cards rerender only when shared dashboard data changes.
export default memo(TopCharts);
