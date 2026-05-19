import React, { useState, useEffect } from "react";
import "./Holidays.css";
import { FaCalendarAlt } from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import TruncatedText from "../components/TruncatedText";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate } from "../utils/date";
import { getStoredToken } from "../utils/authStorage";

function UserHolidays() {
  const token = getStoredToken();

  const [holidays, setHolidays] = useState([]);

  /* ================= FETCH HOLIDAYS ================= */

  const fetchHolidays = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.holidays.list, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = extractCollection(res.data);

      if (!Array.isArray(data)) {
        setHolidays([]);
        return;
      }

      const formatted = sortByRecency(
        data.filter(
          (item) =>
            item.holiday_Name &&
            item.holiday_Name.trim() !== "" &&
            item.holiday_Date !== "0001-01-01T00:00:00"
        )
      ).map((item) => ({
        id: item.id,
        name: item.holiday_Name,
        date: item.holiday_Date
          ? item.holiday_Date.split("T")[0]
          : "",
        day: item.day || "",
        type: item.type || "",
      }));

      setHolidays(formatted);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  /* ================= UI ================= */

  return (
    <div className="holiday-page holiday-page--user">
      <div className="holiday-header">
        <div className="holiday-header-copy">
          <h2>Company Holidays</h2>
          <p>{holidays.length} Holidays This Year</p>
        </div>
      </div>

      <div className="holiday-table-wrapper app-table-scroll">
        <table className="holiday-table holiday-table--user">
          <colgroup>
            <col className="holiday-width-sno" />
            <col className="holiday-width-name" />
            <col className="holiday-width-date" />
            <col className="holiday-width-day" />
            <col className="holiday-width-type" />
          </colgroup>
          <thead>
            <tr>
              <th className="holiday-col-sno">S.No</th>
              <th className="holiday-col-name">Holiday Name</th>
              <th className="holiday-col-date">Date</th>
              <th className="holiday-col-day">Day</th>
              <th className="holiday-col-type">Type</th>
            </tr>
          </thead>

          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan="5" className="app-table-empty-cell">
                  No Holidays Found
                </td>
              </tr>
            ) : (
              holidays.map((h, i) => (
                <tr key={h.id}>
                  <td className="holiday-col-sno">{i + 1}</td>

                  <td className="holiday-col-name">
                    <div className="holiday-name-cell" title={h.name}>
                      <FaCalendarAlt className="holiday-icon" />
                      <TruncatedText className="holiday-name-text" value={h.name} />
                    </div>
                  </td>

                  <td className="holiday-col-date">{formatDate(h.date)}</td>
                  <td className="holiday-col-day">{h.day}</td>
                  <td className="holiday-col-type">{h.type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserHolidays;
