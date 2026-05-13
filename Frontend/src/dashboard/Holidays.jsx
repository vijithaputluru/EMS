import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import {
  compareDatesAsc,
  compareDatesDesc,
  formatDate,
  getTodayInputValue,
} from "../utils/date";

const sortHolidays = (items) => {
  const today = getTodayInputValue();

  return [...items].sort((left, right) => {
    const leftIsUpcoming = left.date >= today;
    const rightIsUpcoming = right.date >= today;

    if (leftIsUpcoming && !rightIsUpcoming) return -1;
    if (!leftIsUpcoming && rightIsUpcoming) return 1;

    return leftIsUpcoming
      ? compareDatesAsc(left.date, right.date)
      : compareDatesDesc(left.date, right.date);
  });
};

function Holidays() {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.holidays.list);

      console.log("Holiday API:", res.data);

      const data = extractCollection(res.data);

      const upcomingHolidays = sortHolidays(
        data
          .filter(
            (holiday) =>
              holiday.holiday_Name &&
              holiday.holiday_Date !== "0001-01-01T00:00:00"
          )
          .map((holiday) => ({
            ...holiday,
            date: holiday.holiday_Date ? holiday.holiday_Date.split("T")[0] : "",
          }))
      )
        .filter((holiday) => holiday.date >= getTodayInputValue())
        .slice(0, 3);

      setHolidays(upcomingHolidays);
    } catch (error) {
      console.error("Holiday fetch error:", error);
      setHolidays([]);
    }
  };

  return (
    <div className="holidays">
      <h3>Upcoming Holidays</h3>

      <div className="holiday-list">
        {holidays.length === 0 ? (
          <p>No upcoming holidays</p>
        ) : (
          holidays.map((holiday, index) => (
            <div className="holiday-item" key={index}>
              <span className="holiday-name">
                {holiday.holiday_Name}
              </span>

              <span className="holiday-date">
                {formatDate(holiday.date)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Holidays;
