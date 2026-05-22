using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardResponseDto> GetDashboardData()
        {
            var utcNow = DateTime.UtcNow;
            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var istNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, istZone);
            var today = istNow.Date;



            // Total Employees
            var totalEmployees = await _context.Employees.CountAsync();

            // Total Departments
            var totalDepartments = await _context.Departments.CountAsync();

            // Active Projects
            var activeProjects = await _context.Projects
                .Where(p => p.Status == "Active")
                .CountAsync();

            // Attendance Today
            var totalAttendance = await _context.Attendance
                .Where(a => a.Attendance_Date == today)
                .CountAsync();

            double attendancePercentage = 0;

            if (totalEmployees > 0)
            {
                attendancePercentage = (double)totalAttendance / totalEmployees * 100;
            }



            // Last 2 hours only
            var activityExpiry = DateTime.UtcNow.AddHours(-2);

            var activityLogs = await _context.ActivityLogs
                .Where(a => a.CreatedAt >= activityExpiry)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .Select(a => new
                {
                    a.Activity,
                    a.CreatedAt
                })
                .ToListAsync();

            var recentActivities = activityLogs
    .Select(a => new RecentActivityDto
    {
        Activity = a.Activity,
        Time = a.CreatedAt.ToString("o") // exact ISO datetime
    })
    .ToList();

            // Upcoming Holidays
            var upcomingHolidays = await _context.Holidays
                .Where(h => h.Holiday_Date >= today)
                .OrderBy(h => h.Holiday_Date)
                .Take(3)
                .Select(h => new UpComingHolidayDto
                {
                    HolidayName = h.Holiday_Name,
                    Date = h.Holiday_Date
                })
                .ToListAsync();

            return new DashboardResponseDto
            {
                TotalEmployees = totalEmployees,
                TotalDepartments = totalDepartments,
                ActiveProjects = activeProjects,
                AttendancePercentage = Math.Round(attendancePercentage, 2),
                RecentActivities = recentActivities,
                UpcomingHolidays = upcomingHolidays
            };
        }

        //private static string GetTimeAgo(DateTime createdAt)
        //{
        //    var now = DateTime.UtcNow;

        //    // If CreatedAt is saved as local/IST but Kind is Unspecified,
        //    // convert it safely
        //    if (createdAt.Kind == DateTimeKind.Unspecified)
        //    {
        //        createdAt = DateTime.SpecifyKind(createdAt, DateTimeKind.Utc);
        //    }

        //    var timeSpan = now - createdAt;

        //    // prevent negative seconds
        //    if (timeSpan.TotalSeconds < 0)
        //        return "Just now";

        //    if (timeSpan.TotalSeconds < 60)
        //        return $"{(int)timeSpan.TotalSeconds} seconds ago";

        //    if (timeSpan.TotalMinutes < 60)
        //        return $"{(int)timeSpan.TotalMinutes} minutes ago";

        //    if (timeSpan.TotalHours < 24)
        //        return $"{(int)timeSpan.TotalHours} hours ago";

        //    if (timeSpan.TotalDays < 7)
        //        return $"{(int)timeSpan.TotalDays} days ago";

        //    return createdAt.ToString("dd MMM yyyy");
        //}
    }
}