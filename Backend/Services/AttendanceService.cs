using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.Security.Claims;
using static System.Runtime.InteropServices.JavaScript.JSType;
using ClosedXML.Excel;
using System.IO;

namespace EmployeeManagementSystem.Services

{

    public class AttendanceService : IAttendanceService

    {

        private readonly AppDbContext _context;

        private readonly IAdminNotificationService _notificationService;

        public AttendanceService(AppDbContext context, IAdminNotificationService notificationService)

        {

            _context = context;

            _notificationService = notificationService;

        }

        //---------------------------------------

        // HELPERS

        //---------------------------------------

        private DateTime ConvertToIST(DateTime utcTime)

        {

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            return TimeZoneInfo.ConvertTimeFromUtc(utcTime, istZone);

        }

        private string MapStatus(string status)

        {

            return status switch

            {

                "P" => "Present",

                "A" => "Absent",

                "L" => "On Leave",

                "W" => "Weekend",

                "H" => "Holiday",

                _ => status

            };

        }

        private string FormatHours(int minutes)

        {

            var hrs = minutes / 60;

            var mins = minutes % 60;

            return $"{hrs}h {mins}m";

        }

        private async Task<Employee?> GetEmployee(ClaimsPrincipal user)

        {

            var email = user.FindFirst(ClaimTypes.Email)?.Value;

            return await _context.Employees.FirstOrDefaultAsync(e => e.Email == email);

        }

        //---------------------------------------

        // CHECK IN (FIXED ONLY HERE)

        //---------------------------------------
        public async Task<IActionResult> CheckIn(ClaimsPrincipal user)
        {
            var emp = await GetEmployee(user);

            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;

            var existing = await _context.Attendance
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == emp.Employee_Id &&
                    x.Attendance_Date.Date == today);

            var now = DateTime.UtcNow;
            var ist = ConvertToIST(now);
            var checkInStartTime = new TimeSpan(8, 55, 0);

            if (ist.TimeOfDay < checkInStartTime)
            {
                return new BadRequestObjectResult(
                    "Check-in is allowed only after 08:55 AM");
            }

            string status = ist.TimeOfDay > new TimeSpan(9, 15, 0)
                ? "Late"
                : "Present";

            var employeeName = emp.Name;

            if (string.IsNullOrWhiteSpace(employeeName))
            {
                employeeName = emp.Email ?? "Employee";
            }

            if (existing != null)
            {
                if (existing.Check_In != null)
                    return new BadRequestObjectResult("Already checked in");

                existing.Check_In = now;
                existing.Status = status;

                _context.ActivityLogs.Add(new ActivityLog
                {
                    Activity = $"{employeeName} checked in",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();

                return new OkObjectResult("Check-in updated successfully");
            }

            _context.Attendance.Add(new Attendance
            {
                Employee_Id = emp.Employee_Id,
                Attendance_Date = today,
                Check_In = now,
                Status = status,
                WorkingMinutes = 0
            });

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"{employeeName} checked in",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new OkObjectResult("Check-in successful");
        }

        //---------------------------------------

        // CHECK OUT

        //---------------------------------------

        public async Task<IActionResult> CheckOut(ClaimsPrincipal user)

        {

            var emp = await GetEmployee(user);

            if (emp == null) return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;

            var att = await _context.Attendance

                .FirstOrDefaultAsync(x => x.Employee_Id == emp.Employee_Id && x.Attendance_Date.Date == today);

            if (att == null)

                return new BadRequestObjectResult("Check-in not found");

            if (att.Check_Out != null)

                return new BadRequestObjectResult("Already checked out");

            var now = DateTime.UtcNow;

            att.Check_Out = now;

            var minutes = (int)(now - att.Check_In.Value).TotalMinutes;

            att.WorkingMinutes = minutes;

            var hours = minutes / 60.0;

            if (hours >= 3 && hours < 4)
                att.Status = "Half Day";
            else if (hours >= 4)
                att.Status = "Present";
            else
                att.Status = "Absent";

            await _context.SaveChangesAsync();

            return new OkObjectResult("Check-out successful");

        }

        //---------------------------------------

        // ADMIN - TODAY

        //---------------------------------------

        public async Task<List<object>> GetTodayAttendance(string status = "All", string search = "")
        {
            var today = DateTime.UtcNow.Date;

            var employees = await _context.Employees
                .AsNoTracking()
                .AsNoTracking().ToListAsync();

            // ✅ Load all attendance once
            var attendanceList = await _context.Attendance
                .AsNoTracking()
                .Where(x => x.Attendance_Date == today)
               .AsNoTracking().ToListAsync();

            var result = new List<object>();

            foreach (var emp in employees)
            {
                var att = attendanceList
                    .FirstOrDefault(x => x.Employee_Id == emp.Employee_Id);

                string finalStatus = att != null ? MapStatus(att.Status) : "Absent";

                if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(finalStatus, status, StringComparison.OrdinalIgnoreCase))
                    continue;

                result.Add(new
                {
                    emp.Name,
                    emp.Department,
                    Status = finalStatus,
                    CheckIn = att?.Check_In != null ? (DateTime?)ConvertToIST(att.Check_In.Value) : null,
                    CheckOut = att?.Check_Out != null ? (DateTime?)ConvertToIST(att.Check_Out.Value) : null,
                    Hours = FormatHours(att?.WorkingMinutes ?? 0)
                });
            }

            return result;
        }

        //---------------------------------------

        // ADMIN - MONTHLY

        //---------------------------------------

        public async Task<List<AdminEmployeeAttendanceDto>> GetAllEmployeeAttendance(int month, int year)
        {
            var employees = await _context.Employees
                .AsNoTracking()
                .AsNoTracking().ToListAsync();

            // ✅ Preload data (MAIN OPTIMIZATION)
            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(x => x.Attendance_Date.Month == month && x.Attendance_Date.Year == year)
                .AsNoTracking().ToListAsync();

            var holidays = await _context.Holidays
                .AsNoTracking()
                .Where(h => h.Holiday_Date.Month == month && h.Holiday_Date.Year == year)
                .AsNoTracking().ToListAsync();

            var leaves = await _context.EmployeeLeaves
                .AsNoTracking()
                .Where(l => l.Status == "Approved")
                .AsNoTracking().ToListAsync();

            var result = new List<AdminEmployeeAttendanceDto>();

            foreach (var emp in employees)
            {
                var days = new List<AdminAttendanceDayDto>();

                for (int d = 1; d <= DateTime.DaysInMonth(year, month); d++)
                {
                    var date = new DateTime(year, month, d, 0, 0, 0, DateTimeKind.Utc);

                    // Weekend
                    if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "W"
                        });
                        continue;
                    }

                    // Holiday
                    var holiday = holidays.FirstOrDefault(h => h.Holiday_Date.Date == date.Date);
                    if (holiday != null)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "H"
                        });
                        continue;
                    }

                    // Leave
                    var leave = leaves.FirstOrDefault(l =>
                        l.EmployeeId == emp.Employee_Id &&
                        date >= l.FromDate &&
                        date <= l.ToDate);

                    if (leave != null)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "L"
                        });
                        continue;
                    }

                    // Attendance
                    var att = attendanceData.FirstOrDefault(x =>
                        x.Employee_Id == emp.Employee_Id &&
                        x.Attendance_Date.Date == date.Date);

                    days.Add(new AdminAttendanceDayDto
                    {
                        Day = d,
                        Status = att != null ? MapStatus(att.Status) : "Absent",
                        CheckIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null,
                        CheckOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null,
                        WorkingMinutes = att?.WorkingMinutes ?? 0
                    });
                }

                result.Add(new AdminEmployeeAttendanceDto
                {
                    EmployeeId = emp.Employee_Id,
                    EmployeeName = emp.Name,
                    Days = days
                });
            }

            return result;
        }

        //---------------------------------------

        // REQUIRED METHODS (UNCHANGED)

        //---------------------------------------

        public async Task<IActionResult> GetWeeklyAttendance(ClaimsPrincipal user)

        {

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;

            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;

            var monday = DateTime.SpecifyKind(today.AddDays(-diff), DateTimeKind.Utc);

            var weekEnd = monday.AddDays(7);

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= monday &&

                            a.Attendance_Date < weekEnd)

               .AsNoTracking().ToListAsync();

            var result = new List<object>();

            // ✅ WEEKEND FIX


            for (int i = 0; i < 7; i++)

            {

                var date = monday.AddDays(i);

                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "W",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue; // 🔥 VERY IMPORTANT
                }

                // ✅ STEP 4: HOLIDAY CHECK
                var holiday = await _context.Holidays
      .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }
                var att = attendances

                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;

                DateTime? checkOut = null;


                if (att?.Check_In != null)

                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)

                    checkOut = ConvertToIST(att.Check_Out.Value);

                result.Add(new
                {
                    Day = date.DayOfWeek.ToString(),
                    Date = date.ToString("dd MMM yyyy"),   // ✅ ADD
                    Status = att != null
                    ? (att.Status == "Half Day" ? "HD"
                    : att.Status == "Present" ? "P"
                    : att.Status == "Late" ? "P"
                    : att.Status)
                    : "A",
                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });

            }

            return new OkObjectResult(result);

        }

        public async Task<IActionResult> GetPreviousWeekAttendance(ClaimsPrincipal user)

        {

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;

            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;

            var currentMonday = DateTime.SpecifyKind(today.AddDays(-diff), DateTimeKind.Utc);

            var monday = currentMonday.AddDays(-7); // ✅ previous week

            var weekEnd = monday.AddDays(7);

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= monday &&

                            a.Attendance_Date < weekEnd)

               .AsNoTracking().ToListAsync();

            var result = new List<object>();


            for (int i = 0; i < 7; i++)
            {
                var date = monday.AddDays(i);

                // ✅ Weekend
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "W",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ STEP 4: HOLIDAY CHECK
                var holiday = await _context.Holidays
     .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name, // ✅ ADD THIS
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                var att = attendances
                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null;
                DateTime? checkOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null;

                result.Add(new
                {
                    Day = date.DayOfWeek.ToString(),
                    Date = date.ToString("dd MMM yyyy"),
                    Status = att != null
                        ? (att.Status == "Half Day" ? "HD"
                        : att.Status == "Present" ? "P"
                        : att.Status == "Late" ? "P"
                        : att.Status)
                        : "A",

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });
            }

            return new OkObjectResult(result);

        }

        // CURRENT MONTH ATTENDANCE

        public async Task<IActionResult> GetCurrentMonthAttendance(ClaimsPrincipal user)

        {

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow;

            // ✅ First day of current month

            var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // ✅ Tomorrow (to avoid time issues)

            var tomorrow = today.Date.AddDays(1);
            var employeeId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= startOfMonth &&

                            a.Attendance_Date < tomorrow)

                .AsNoTracking().ToListAsync();

            var totalDays = DateTime.DaysInMonth(today.Year, today.Month);

            var result = new List<object>();

            for (int day = 1; day <= totalDays; day++)

            {

                var date = DateTime.SpecifyKind(

    new DateTime(today.Year, today.Month, day),

    DateTimeKind.Utc

);

                // ✅ Weekend check

                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)

                {

                    result.Add(new

                    {

                        Day = day,

                        Status = "W",

                        CheckIn = (DateTime?)null,

                        CheckOut = (DateTime?)null,

                        Hours = "0h 0m"

                    });

                    continue;

                }

                // ✅ Holiday check

                var holiday = await _context.Holidays
    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // ✅ Leave check

                var leave = await _context.EmployeeLeaves
    .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                             l.Status == "Approved" &&
                             date >= l.FromDate &&
                             date <= l.ToDate);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        LeaveType = leave.LeaveType, // ✅ ADD THIS
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                var att = attendances

                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;

                DateTime? checkOut = null;

                if (att?.Check_In != null)

                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)

                    checkOut = ConvertToIST(att.Check_Out.Value);

                result.Add(new
                {
                    Day = day,
                    Status = att != null
        ? (att.Status == "Half Day" ? "HD"
        : att.Status == "Present" ? "P"
        : att.Status == "Late" ? "P"
        : att.Status)
        : "A",

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });

            }

            return new OkObjectResult(result);

        }

        //PREVIOUS MONTH

        public async Task<IActionResult> GetPreviousMonthAttendance(ClaimsPrincipal user)

        {

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow;

            var firstDayCurrentMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var lastMonthEnd = firstDayCurrentMonth.AddDays(-1);

            var lastMonthStart = new DateTime(lastMonthEnd.Year, lastMonthEnd.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= lastMonthStart &&

                            a.Attendance_Date <= lastMonthEnd)

                .AsNoTracking().ToListAsync();

            var totalDays = DateTime.DaysInMonth(lastMonthStart.Year, lastMonthStart.Month);

            var employeeId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;


            var result = new List<object>();

            for (int day = 1; day <= totalDays; day++)
            {
                var date = DateTime.SpecifyKind(
                    new DateTime(lastMonthStart.Year, lastMonthStart.Month, day),
                    DateTimeKind.Utc
                );

                // ✅ Weekend
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = day,
                        Status = "W",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ Holiday
                var holiday = await _context.Holidays
    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name, // ✅ ADD
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // ✅ Leave
                var leave = await _context.EmployeeLeaves
    .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                             l.Status == "Approved" &&
                             date >= l.FromDate &&
                             date <= l.ToDate);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        LeaveType = leave.LeaveType, // ✅ ADD THIS
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                var att = attendances
                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null;
                DateTime? checkOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null;

                result.Add(new
                {
                    Day = day,
                    Status = att != null
                        ? (att.Status == "Half Day" ? "HD"
                        : att.Status == "Present" ? "P"
                        : att.Status == "Late" ? "P"
                        : att.Status)
                        : "A",

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });
            }

            return new OkObjectResult(result);

        }

        public async Task CheckMissedCheckIns() { }

        public async Task CheckMissingCheckouts()

        {
            Console.WriteLine("Auto checkout running...");
            var nowUtc = DateTime.UtcNow;
            var today = nowUtc.Date;

            var istNow = ConvertToIST(nowUtc);

            var officeEndTime = new TimeSpan(18, 15, 0); // 6:15 PM
            var autoCheckoutTime = officeEndTime;
            if (istNow.TimeOfDay < autoCheckoutTime)
                return;

            var records = await _context.Attendance
                .Where(a =>
                    a.Attendance_Date.Date == today &&
                    a.Check_In != null &&
                    a.Check_Out == null)
                .ToListAsync();

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            foreach (var att in records)
            {
                // save checkout as 6:00 PM
                var autoCheckoutIst = new DateTime(
                    istNow.Year,
                    istNow.Month,
                    istNow.Day,
                    officeEndTime.Hours,
                    officeEndTime.Minutes,
                    0,
                    DateTimeKind.Unspecified
                );

                var autoCheckoutUtc = TimeZoneInfo.ConvertTimeToUtc(autoCheckoutIst, istZone);

                att.Check_Out = autoCheckoutUtc;

                var minutes = (int)(att.Check_Out.Value - att.Check_In.Value).TotalMinutes;
                att.WorkingMinutes = minutes;

                var hours = minutes / 60.0;

                if (hours >= 3 && hours < 4)
                    att.Status = "Half Day";
                else if (hours >= 4)
                    att.Status = "Present";
                else
                    att.Status = "Absent";
            }

            await _context.SaveChangesAsync();
        }

        public async Task<object> GetTodayStats()
        {
            await CheckMissingCheckouts();

            var today = DateTime.UtcNow.Date;

            var totalEmployees = await _context.Employees.CountAsync();

            var todayAttendance = await _context.Attendance
                .Where(a => a.Attendance_Date.Date == today)
                .AsNoTracking().ToListAsync();

            var presentCount = todayAttendance.Count(a => a.Status == "Present");

            var lateCount = todayAttendance.Count(a => a.Status == "Late");

            var absentCount = totalEmployees - presentCount;

            return new
            {
                TotalEmployees = totalEmployees,
                Present = presentCount,
                Absent = absentCount,
                Late = lateCount
            };
        }


        public async Task<IActionResult> GetMonthAttendance(
    ClaimsPrincipal user,
    int month,
    int year)
        {
            var emp = await GetEmployee(user);
            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var employeeId = emp.Employee_Id;

            var daysInMonth = DateTime.DaysInMonth(year, month);

            var result = new List<object>();

            for (int i = 1; i <= daysInMonth; i++)
            {
                var date = DateTime.SpecifyKind(
    new DateTime(year, month, i),
    DateTimeKind.Utc
);

                // ✅ WEEKEND
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "W",
                        HolidayName = (string?)null,
                        LeaveType = (string?)null,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ HOLIDAY
                var holiday = await _context.Holidays
                    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name,
                        LeaveType = (string?)null,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ LEAVE
                var leave = await _context.EmployeeLeaves
                    .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                                             l.Status == "Approved" &&
                                             date >= l.FromDate &&
                                             date <= l.ToDate);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        HolidayName = (string?)null,
                        LeaveType = leave.LeaveType,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ ATTENDANCE
                var att = await _context.Attendance
                    .FirstOrDefaultAsync(a => a.Employee_Id == employeeId &&
                                             a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;
                DateTime? checkOut = null;

                if (att?.Check_In != null)
                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)
                    checkOut = ConvertToIST(att.Check_Out.Value);

                result.Add(new
                {
                    Day = i,
                    Date = date.ToString("dd MMM yyyy"),
                    Status = att != null
                        ? (att.Status == "Half Day" ? "HD"
                          : att.Status == "Present" ? "P"
                          : att.Status == "Late" ? "P"
                          : att.Status)
                        : "A",
                    HolidayName = (string?)null,
                    LeaveType = (string?)null,
                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });
            }

            return new OkObjectResult(result);
        }

        public async Task<object> GetYearlySummary(int year)
        {
            var result = new List<object>();

            for (int month = 1; month <= 12; month++)
            {
                var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var endDate = startDate.AddMonths(1);

                var attendance = await _context.Attendance
                    .Where(a => a.Attendance_Date >= startDate &&
                                a.Attendance_Date < endDate)
                   .AsNoTracking().ToListAsync();

                var presentCount = attendance.Count(a => a.Status == "Present");
                var lateCount = attendance.Count(a => a.Status == "Late");

                // Optional: you can calculate absent based on employee count
                var totalEmployees = await _context.Employees.CountAsync();
                var workingDays = DateTime.DaysInMonth(year, month);

                var totalExpected = totalEmployees * workingDays;

                var absentCount = totalExpected - (presentCount + lateCount);

                result.Add(new
                {
                    Month = new DateTime(year, month, 1).ToString("MMMM"),
                    Present = presentCount,
                    Late = lateCount,
                    Absent = absentCount
                });
            }

            return result;
        }

        public async Task<IActionResult> AdminUpdateAttendance(
            string employeeId,
            DateTime date,
            DateTime? checkIn,
            DateTime? checkOut)
        {
            if (date.Date > DateTime.UtcNow.Date)
                return new BadRequestObjectResult("Cannot mark future attendance");

            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
            {
                return new BadRequestObjectResult(
                    "Weekend attendance cannot be updated");
            }

            var utcDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

            // Holiday check
            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == utcDate.Date);

            if (isHoliday)
            {
                return new BadRequestObjectResult("Holiday attendance cannot be updated");
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == employeeId &&
                    a.Attendance_Date.Date == utcDate.Date);

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            DateTime? checkInUtc = null;
            DateTime? checkOutUtc = null;

            if (checkIn != null && checkIn.Value.TimeOfDay == TimeSpan.Zero)
                return new BadRequestObjectResult("Invalid check-in time");

            if (checkOut != null && checkOut.Value.TimeOfDay == TimeSpan.Zero)
                return new BadRequestObjectResult("Invalid check-out time");

            if (checkIn != null)
            {
                checkInUtc = TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(checkIn.Value, DateTimeKind.Unspecified),
                    istZone);
            }

            if (checkOut != null)
            {
                checkOutUtc = TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(checkOut.Value, DateTimeKind.Unspecified),
                    istZone);
            }

            if (checkInUtc != null &&
                checkOutUtc != null &&
                checkOutUtc < checkInUtc)
            {
                return new BadRequestObjectResult("Check-out cannot be before check-in");
            }

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = employeeId,
                    Attendance_Date = utcDate
                };

                _context.Attendance.Add(attendance);
            }

            attendance.Check_In = checkInUtc;
            attendance.Check_Out = checkOutUtc;

            if (attendance.Check_In != null &&
                attendance.Check_Out != null)
            {
                var minutes = (int)(attendance.Check_Out.Value - attendance.Check_In.Value).TotalMinutes;

                attendance.WorkingMinutes = minutes;

                var hours = minutes / 60.0;

                if (hours >= 3 && hours < 4)
                    attendance.Status = "Half Day";
                else if (hours >= 4)
                    attendance.Status = "Present";
                else
                    attendance.Status = "Absent";
            }
            else if (attendance.Check_In != null &&
                     attendance.Check_Out == null)
            {
                attendance.WorkingMinutes = 0;
                attendance.Status = "Present";
            }
            else
            {
                attendance.WorkingMinutes = 0;
                attendance.Status = "Absent";
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult("Attendance updated by admin");
        }

        //ATTENDANCE SUMMARY

        public async Task<AttendanceSummaryDto> GetMonthlyAttendanceSummary(string employeeId, int month, int year)

        {

            var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);

            var end = start.AddMonths(1);

            // Attendance

            var attendances = await _context.Attendance

                .AsNoTracking()

                .Where(a =>

                    a.Employee_Id == employeeId &&

                    a.Attendance_Date >= start &&

                    a.Attendance_Date < end)

                .ToListAsync();

            var attendanceLookup = attendances

                .GroupBy(a => a.Attendance_Date.Date)

                .ToDictionary(g => g.Key, g => g.First());

            // Holidays

            var holidaySet = (await _context.Holidays

                .AsNoTracking()

                .Where(h =>

                    h.Holiday_Date >= start &&

                    h.Holiday_Date < end)

                .Select(h => h.Holiday_Date.Date)

                .ToListAsync())

                .ToHashSet();

            // Leaves

            var leaves = await _context.EmployeeLeaves

                .AsNoTracking()

                .Where(l =>

                    l.EmployeeId == employeeId &&

                    l.Status == "Approved")

                .ToListAsync();

            decimal present = 0;

            int absent = 0;

            int totalDays = DateTime.DaysInMonth(year, month);

            for (int day = 1; day <= totalDays; day++)

            {

                var date = new DateTime(

                    year,

                    month,

                    day,

                    0,

                    0,

                    0,

                    DateTimeKind.Utc);

                // Weekend

                if (date.DayOfWeek == DayOfWeek.Saturday ||

                    date.DayOfWeek == DayOfWeek.Sunday)

                {

                    continue;

                }

                // Holiday

                if (holidaySet.Contains(date.Date))

                {

                    continue;

                }

                // Leave

                bool isLeave = leaves.Any(l =>

                    date >= l.FromDate &&

                    date <= l.ToDate);

                if (isLeave)

                {

                    present++;

                    continue;

                }

                // Attendance

                if (attendanceLookup.TryGetValue(date.Date, out var att))

                {

                    if (att.Status == "Half Day")

                        present += 0.5m;

                    else

                        present += 1m;

                }

                else

                {

                    absent++;

                }

            }

            return new AttendanceSummaryDto

            {

                PresentDays = present,

                AbsentDays = absent

            };

        }


        public async Task<IActionResult> GetEmployeeWorkingHours(
    string employeeId,
    DateOnly fromDate,
    DateOnly toDate)
        {
            var startDate = DateTime.SpecifyKind(
                fromDate.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);

            var endDate = DateTime.SpecifyKind(
                toDate.ToDateTime(TimeOnly.MinValue).AddDays(1),
                DateTimeKind.Utc);

            // selected date range attendance
            var attendance = await _context.Attendance
                .Where(a => a.Employee_Id == employeeId &&
                            a.Attendance_Date >= startDate &&
                            a.Attendance_Date < endDate)
                .OrderBy(a => a.Attendance_Date)
                .Select(a => new
                {
                    a.Attendance_Date,
                    a.WorkingMinutes,
                    a.Status
                })
                .ToListAsync();

            var totalSelectedMinutes = attendance.Sum(a => a.WorkingMinutes);

            // day-wise data
            var dailyWorkingHours = attendance
                .GroupBy(a => a.Attendance_Date.Date)
                .Select(g => new
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Day = g.Key.DayOfWeek.ToString(),
                    Status = g.First().Status,
                    WorkingHours = Math.Round(g.Sum(x => x.WorkingMinutes) / 60.0, 2)
                })
                .ToList();

            // week-wise data
            var weeklyWorkingHours = attendance
                .GroupBy(a =>
                {
                    var date = a.Attendance_Date.Date;
                    int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                    return date.AddDays(-diff);
                })
                .Select(g => new
                {
                    WeekStart = g.Key < startDate.Date
                        ? startDate.Date.ToString("yyyy-MM-dd")
                        : g.Key.ToString("yyyy-MM-dd"),

                    WeekEnd = g.Key.AddDays(6) > toDate.ToDateTime(TimeOnly.MinValue).Date
                        ? toDate.ToString("yyyy-MM-dd")
                        : g.Key.AddDays(6).ToString("yyyy-MM-dd"),

                    TotalWorkingHours = Math.Round(g.Sum(x => x.WorkingMinutes) / 60.0, 2),

                    Days = g.Select(x => new
                    {
                        Date = x.Attendance_Date.ToString("yyyy-MM-dd"),
                        Day = x.Attendance_Date.DayOfWeek.ToString(),
                        Status = x.Status,
                        WorkingHours = Math.Round(x.WorkingMinutes / 60.0, 2)
                    }).ToList()
                })
                .ToList();

            // complete month working hours based on fromDate month
            var monthStart = new DateTime(fromDate.Year, fromDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);

            var monthlyMinutes = await _context.Attendance
                .Where(a => a.Employee_Id == employeeId &&
                            a.Attendance_Date >= monthStart &&
                            a.Attendance_Date < monthEnd)
                .SumAsync(a => (int?)a.WorkingMinutes) ?? 0;

            return new OkObjectResult(new
            {
                EmployeeId = employeeId,
                FromDate = fromDate.ToString("yyyy-MM-dd"),
                ToDate = toDate.ToString("yyyy-MM-dd"),

                SelectedRangeWorkingHours = Math.Round(totalSelectedMinutes / 60.0, 2),

                DailyWorkingHours = dailyWorkingHours,

                WeeklyWorkingHours = weeklyWorkingHours,

                Month = fromDate.ToString("MMMM yyyy"),
                CompleteMonthWorkingHours = Math.Round(monthlyMinutes / 60.0, 2)
            });
        }

        public async Task<byte[]> ExportMonthlyAttendance(int month, int year)
        {
            var attendance = await GetAllEmployeeAttendance(month, year);
            var monthName = new DateTime(year, month, 1).ToString("MMMM");

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add($"{monthName} Attendance");

            worksheet.Cell(1, 1).Value = "Employee Id";
            worksheet.Cell(1, 2).Value = "Employee Name";


            int totalDays = DateTime.DaysInMonth(year, month);

            for (int day = 1; day <= totalDays; day++)
            {
                worksheet.Cell(1, day + 2).Value = day;
            }
            worksheet.Cell(1, totalDays + 3).Value = "P";
            worksheet.Cell(1, totalDays + 4).Value = "A";
            worksheet.Cell(1, totalDays + 5).Value = "OL";
            worksheet.Cell(1, totalDays + 6).Value = "LT";
            worksheet.Cell(1, totalDays + 7).Value = "W";
            worksheet.Cell(1, totalDays + 8).Value = "HD";
            worksheet.Cell(1, totalDays + 9).Value = "H";
            var header = worksheet.Range(1, 1, 1, totalDays + 2);

            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

            int row = 2;

            foreach (var emp in attendance)
            {
                int presentCount = 0;
                int absentCount = 0;
                int leaveCount = 0;
                int lateCount = 0;
                int weekendCount = 0;
                int halfDayCount = 0;
                int holidayCount = 0;
                worksheet.Cell(row, 1).Value = emp.EmployeeId;
                worksheet.Cell(row, 2).Value = emp.EmployeeName;

                for (int i = 0; i < emp.Days.Count; i++)
                {
                    var status = emp.Days[i].Status;
                    switch (status)
                    {
                        case "Present":
                        case "P":
                            presentCount++;
                            break;

                        case "Absent":
                        case "A":
                            absentCount++;
                            break;

                        case "L":
                        case "On Leave":
                            leaveCount++;
                            break;

                        case "Late":
                        case "LT":
                            lateCount++;
                            break;

                        case "W":
                            weekendCount++;
                            break;

                        case "HD":
                        case "Half Day":
                            halfDayCount++;
                            break;

                        case "H":
                            holidayCount++;
                            break;
                    }


                    var cell = worksheet.Cell(row, i + 3);
                    cell.Value = status;

                    ApplyStatusColor(cell, status);
                }
                worksheet.Cell(row, totalDays + 3).Value = presentCount;
                worksheet.Cell(row, totalDays + 4).Value = absentCount;
                worksheet.Cell(row, totalDays + 5).Value = leaveCount;
                worksheet.Cell(row, totalDays + 6).Value = lateCount;
                worksheet.Cell(row, totalDays + 7).Value = weekendCount;
                worksheet.Cell(row, totalDays + 8).Value = halfDayCount;
                worksheet.Cell(row, totalDays + 9).Value = holidayCount;

                row++;
            }
            
            worksheet.Rows().Height = 24;

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }



        public async Task<byte[]> ExportWeeklyAttendance(DateTime weekStartDate)
        {
            var monday = DateTime.SpecifyKind(weekStartDate.Date, DateTimeKind.Utc);
            var weekEnd = monday.AddDays(7);

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date >= monday && a.Attendance_Date < weekEnd)
                .ToListAsync();

            var holidays = await _context.Holidays
                .AsNoTracking()
                .Where(h => h.Holiday_Date >= monday && h.Holiday_Date < weekEnd)
                .ToListAsync();

            var leaves = await _context.EmployeeLeaves
                .AsNoTracking()
                .Where(l => l.Status == "Approved")
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Weekly Attendance");

            worksheet.Cell(1, 1).Value = "Employee Id";
            worksheet.Cell(1, 2).Value = "Employee Name";

            for (int i = 0; i < 7; i++)
            {
                worksheet.Cell(1, i + 3).Value = monday.AddDays(i).ToString("dddd dd MMM");
            }
            worksheet.Cell(1, 10).Value = "P";
            worksheet.Cell(1, 11).Value = "A";
            worksheet.Cell(1, 12).Value = "OL";
            worksheet.Cell(1, 13).Value = "LT";
            worksheet.Cell(1, 14).Value = "W";
            worksheet.Cell(1, 15).Value = "HD";
            worksheet.Cell(1, 16).Value = "H";

            var header = worksheet.Range(1, 1, 1, 9);

            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

            int row = 2;

            foreach (var emp in employees)
            {
                int presentCount = 0;
                int absentCount = 0;
                int leaveCount = 0;
                int lateCount = 0;
                int weekendCount = 0;
                int halfDayCount = 0;
                int holidayCount = 0;
                worksheet.Cell(row, 1).Value = emp.Employee_Id;
                worksheet.Cell(row, 2).Value = emp.Name;

                for (int i = 0; i < 7; i++)
                {
                    var date = monday.AddDays(i);

                    string status;

                    if (date.DayOfWeek == DayOfWeek.Saturday ||
                        date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        status = "W";
                    }
                    else if (holidays.Any(h => h.Holiday_Date.Date == date.Date))
                    {
                        status = "H";
                    }
                    else if (leaves.Any(l =>
                        l.EmployeeId == emp.Employee_Id &&
                        date >= l.FromDate.Date &&
                        date <= l.ToDate.Date))
                    {
                        status = "L";
                    }
                    else
                    {
                        var att = attendanceData.FirstOrDefault(a =>
                            a.Employee_Id == emp.Employee_Id &&
                            a.Attendance_Date.Date == date.Date);

                        status = att != null ? MapStatus(att.Status) : "Absent";
                    }

                    var cell = worksheet.Cell(row, i + 3);
                    cell.Value = status;
                    switch (status)
                    {
                        case "P":
                        case "Present":
                            presentCount++;
                            break;

                        case "A":
                        case "Absent":
                            absentCount++;
                            break;

                        case "L":
                        case "On Leave":
                            leaveCount++;
                            break;

                        case "LT":
                        case "Late":
                            lateCount++;
                            break;

                        case "W":
                            weekendCount++;
                            break;

                        case "HD":
                        case "Half Day":
                            halfDayCount++;
                            break;

                        case "H":
                            holidayCount++;
                            break;
                    }

                    ApplyStatusColor(cell, status);
                }
                worksheet.Cell(row, 10).Value = presentCount;
                worksheet.Cell(row, 11).Value = absentCount;
                worksheet.Cell(row, 12).Value = leaveCount;
                worksheet.Cell(row, 13).Value = lateCount;
                worksheet.Cell(row, 14).Value = weekendCount;
                worksheet.Cell(row, 15).Value = halfDayCount;
                worksheet.Cell(row, 16).Value = holidayCount;

                row++;
            }

            worksheet.Rows().Height = 24;
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }
        public async Task<byte[]> ExportDailyAttendance(DateTime date)
        {
            date = date.Date;

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date.Date == date)
                .ToListAsync();
            var reportData = employees
    .Select(emp =>
    {
        var att = attendanceData
            .FirstOrDefault(a => a.Employee_Id == emp.Employee_Id);

        var status = att != null
            ? MapStatus(att.Status)
            : "Absent";

        return new
        {
            Employee = emp,
            Attendance = att,
            Status = status
        };
    })
    .OrderBy(x =>
        x.Status == "Present" ? 1 :
        x.Status == "Late" ? 2 :
        x.Status == "Half Day" ? 3 :
        x.Status == "On Leave" ? 4 :
        5)
    .ThenBy(x => x.Attendance?.Check_In);

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Daily Attendance");

            worksheet.Cell(1, 1).Value = "Employee ID";
            worksheet.Cell(1, 2).Value = "Employee Name";
            worksheet.Cell(1, 3).Value = "Department";
            worksheet.Cell(1, 4).Value = "Date";
            worksheet.Cell(1, 5).Value = "Check In";
            worksheet.Cell(1, 6).Value = "Check Out";
            worksheet.Cell(1, 7).Value = "Status";
            worksheet.Cell(1, 8).Value = "Working Hours";

            int row = 2;

            foreach (var item in reportData)
            {
                var emp = item.Employee;
                var att = item.Attendance;

                worksheet.Cell(row, 1).Value = emp.Employee_Id;
                worksheet.Cell(row, 2).Value = emp.Name;
                worksheet.Cell(row, 3).Value = emp.Department;
                worksheet.Cell(row, 4).Value = date.ToString("dd-MMM-yyyy");

                worksheet.Cell(row, 5).Value =
                    att?.Check_In != null
                    ? ConvertToIST(att.Check_In.Value).ToString("hh:mm tt")
                    : "-";

                worksheet.Cell(row, 6).Value =
                    att?.Check_Out != null
                    ? ConvertToIST(att.Check_Out.Value).ToString("hh:mm tt")
                    : "-";

                worksheet.Cell(row, 7).Value =
                    att != null ? MapStatus(att.Status) : "Absent";

                worksheet.Cell(row, 8).Value =
                    att != null ? FormatHours(att.WorkingMinutes) : "0h 0m";

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }
        private void ApplyStatusColor(IXLCell cell, string status)
        {
            status = status?.Trim();

            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.LightGray;

            cell.Style.Font.FontColor = XLColor.Black;

            switch (status)
            {
                case "Present":
                case "P":
                case "Late":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#DFF6DD");
                    cell.Value = "P";
                    break;

                case "Absent":
                case "A":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FDE2E1");
                    cell.Value = "A";
                    break;

                case "Half Day":
                case "HD":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CC");
                    cell.Value = "HD";
                    break;

                case "W":
                case "Weekend":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Value = "W";
                    break;

                case "H":
                case "Holiday":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#DCEBFF");
                    cell.Value = "H";
                    break;

                case "L":
                case "On Leave":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E9D5FF");
                    cell.Value = "L";
                    break;

                default:
                    cell.Style.Fill.BackgroundColor = XLColor.White;
                    break;
            }
        }
    }
}




