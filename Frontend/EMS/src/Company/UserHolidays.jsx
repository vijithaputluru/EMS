import React, { useState, useEffect } from "react";
import "./Holidays.css";
import { FaCalendarAlt } from "react-icons/fa";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import TruncatedText from "../components/TruncatedText";
import { extractCollection, sortByRecency } from "../utils/collections";
import { formatDate } from "../utils/date";
import { getStoredToken } from "../utils/authStorage";

function Holidays() {
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
    <div className="holiday-page">

      <div className="holiday-header">
        <div>
          <h2>Company Holidays</h2>
          <p>{holidays.length} Holidays This Year</p>
        </div>
      </div>

      <div className="holiday-table-wrapper">

        <table
          className="holiday-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >

          <thead>
            <tr>

              <th
                style={{
                  width: "70px",
                  textAlign: "center",
                  padding: "18px 16px",
                }}
              >
                S.No
              </th>

              <th
                style={{
                  width: "42%",
                  textAlign: "center",
                  padding: "18px 16px",
                }}
              >
                Holiday Name
              </th>

              <th
                style={{
                  width: "160px",
                  textAlign: "center",
                  padding: "18px 16px",
                }}
              >
                Date
              </th>

              <th
                style={{
                  width: "140px",
                  textAlign: "center",
                  padding: "18px 16px",
                }}
              >
                Day
              </th>

              <th
                style={{
                  width: "140px",
                  textAlign: "center",
                  padding: "18px 16px",
                }}
              >
                Type
              </th>

            </tr>
          </thead>

          <tbody>

            {holidays.length === 0 ? (

              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                  }}
                >
                  No Holidays Found
                </td>
              </tr>

            ) : (

              holidays.map((h, i) => (

                <tr
                  key={h.id}
                  style={{
                    height: "90px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >

                  {/* SERIAL NUMBER */}

                  <td
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      padding: "16px",
                    }}
                  >
                    {i + 1}
                  </td>

                  {/* HOLIDAY NAME */}

                  <td
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      padding: "16px 24px",
                    }}
                  >
                    <div
                      title={h.name}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",

                        maxWidth: "340px",
                        margin: "0 auto",

                        verticalAlign: "middle",
                      }}
                    >

                      <FaCalendarAlt
                        style={{
                          flexShrink: 0,
                          fontSize: "16px",
                          color: "#0f172a",
                        }}
                      />

                      <div
                        style={{
                          whiteSpace: "normal",
                          overflowWrap: "break-word",
                          wordBreak: "break-word",
                          lineHeight: "1.5",
                          textAlign: "left",

                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        <TruncatedText value={h.name} />
                      </div>

                    </div>
                  </td>

                  {/* DATE */}

                  <td
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                      padding: "16px",
                    }}
                  >
                    {formatDate(h.date)}
                  </td>

                  {/* DAY */}

                  <td
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                      padding: "16px",
                    }}
                  >
                    {h.day}
                  </td>

                  {/* TYPE */}

                  <td
                    style={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                      padding: "16px",
                    }}
                  >
                    {h.type}
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Holidays;