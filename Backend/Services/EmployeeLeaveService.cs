using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.Security.Claims;
using ClosedXML.Excel;

public class EmployeeLeaveService : IEmployeeLeaveService

{

    private readonly AppDbContext _context;

    private readonly IAdminNotificationService _notificationService;

    public EmployeeLeaveService(

    AppDbContext context,

    IAdminNotificationService notificationService)

    {

        _context = context;

        _notificationService = notificationService;

    }

    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto, ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
            return new BadRequestObjectResult(new { message = "Employee not found" });

        var fromDate = dto.FromDate.Date;
        var toDate = dto.ToDate.Date;

        if (fromDate > toDate)
        {
            return new BadRequestObjectResult(new
            {
                message = "From date cannot be greater than To date"
            });
        }

        var alreadyApplied = await _context.EmployeeLeaves
            .AsNoTracking()
            .AnyAsync(l =>
                l.EmployeeId == employee.Employee_Id &&
                l.Status != "Rejected" &&
                l.Status != "Cancelled" &&
                fromDate <= l.ToDate.Date &&
                toDate >= l.FromDate.Date
            );

        if (alreadyApplied)
            return new BadRequestObjectResult(new
            {
                message = "You already applied leave for this date"
            });

        int workingDays = await CalculateSandwichLeaveDays(
     employee.Employee_Id,
     fromDate,
     toDate);

        if (workingDays == 0)
        {
            return new BadRequestObjectResult(new
            {
                message = "Leave cannot be applied for weekends or holidays"
            });
        }

        var leave = new EmployeeLeave
        {
            EmployeeId = employee.Employee_Id,
            EmployeeName = employee.Name,
            LeaveType = dto.LeaveType,
            FromDate = fromDate,
            ToDate = toDate,
            Reason = dto.Reason,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await _context.EmployeeLeaves.AddAsync(leave);
        await _context.SaveChangesAsync();

        _context.AdminNotifications.Add(new AdminNotification
        {
            Title = "Leave Request",
            Message = $"{employee.Name} applied for leave",
            UserRole = "Admin",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new OkObjectResult(new
        {
            message = "Leave applied successfully"
        });
    }
    public async Task<IActionResult> UpdateStatus(int id, string status)

    {

        var leave = await _context.EmployeeLeaves.FindAsync(id);

        if (leave == null)

            return new NotFoundObjectResult("Leave not found");

        var fromDate = DateTime.SpecifyKind(leave.FromDate, DateTimeKind.Utc);

        var toDate = DateTime.SpecifyKind(leave.ToDate, DateTimeKind.Utc);

        //---------------------------------------

        // ✅ STORE OLD STATUS (IMPORTANT FIX)

        //---------------------------------------

        var oldStatus = leave.Status;

        //---------------------------------------

        // ✅ CHECK BEFORE UPDATE (KEEP YOUR LOGIC)

        //---------------------------------------

        if (leave.Status == "Approved" && status == "Approved")

            return new BadRequestObjectResult("Already approved");

        //---------------------------------------

        // GET BALANCE

        //---------------------------------------

        var balance = await _context.EmployeeLeaveBalances

            .FirstOrDefaultAsync(b => b.Employee_Id == leave.EmployeeId);

        if (balance == null)

        {

            balance = new EmployeeLeaveBalance

            {

                Employee_Id = leave.EmployeeId

            };

            _context.EmployeeLeaveBalances.Add(balance);

            await _context.SaveChangesAsync();

        }

        int days = await CalculateSandwichLeaveDays(
    leave.EmployeeId,
    fromDate,
    toDate);

        var leaveType = leave.LeaveType?.Trim().ToLower();

        //---------------------------------------

        // ✅ CASE 1: Pending/Rejected → Approved

        //---------------------------------------

        //if (oldStatus != "Approved" && status == "Approved")

        //{

        //    switch (leaveType)

        //    {

        //        case "casual":

        //            balance.Casual_Used += days;

        //            break;

        //        case "sick":

        //            balance.Sick_Used += days;

        //            break;

        //        case "earned":

        //        case "earned leave":

        //            balance.Earned_Used += days;

        //            break;

        //    }

        //}

        ////---------------------------------------

        //// ✅ CASE 2: Approved → Rejected

        ////---------------------------------------

        //if (oldStatus == "Approved" && status == "Rejected")

        //{

        //    switch (leaveType)

        //    {

        //        case "casual":

        //            balance.Casual_Used -= days;

        //            break;

        //        case "sick":

        //            balance.Sick_Used -= days;

        //            break;

        //        case "earned":

        //        case "earned leave":

        //            balance.Earned_Used -= days;

        //            break;

        //    }

        //}

        //---------------------------------------

        // UPDATE STATUS

        //---------------------------------------

        leave.Status = status;

        _context.UserNotifications.Add(new UserNotification

        {

            Employee_Id = leave.EmployeeId,

            Title = "Leave Status Update",

            Message = status == "Approved"

        ? "Your leave request has been approved"

        : "Your leave request has been rejected",

            IsRead = false,

            CreatedAt = DateTime.UtcNow

        });

        await _context.SaveChangesAsync();
        await RecalculateLeaveBalance(leave.EmployeeId);

        return new OkObjectResult("Leave updated successfully");

    }

    public async Task<IActionResult> GetAllLeaves()

    {

        var leaves = await _context.EmployeeLeaves.ToListAsync();

        return new OkObjectResult(leaves);

    }

    public async Task<IActionResult> GetMyLeaves(ClaimsPrincipal user)

    {

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees

        .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        var leaves = await _context.EmployeeLeaves

            .Where(l => l.EmployeeId == employee.Employee_Id)

            .ToListAsync();

        return new OkObjectResult(leaves);

    }

    public async Task<IActionResult> GetBalance(ClaimsPrincipal user)

    {

        // STEP 1: GET EMAIL FROM TOKEN

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        if (string.IsNullOrEmpty(email))

            return new UnauthorizedObjectResult("Invalid token");

        // STEP 2: GET EMPLOYEE

        var employee = await _context.Employees

        .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)

            return new BadRequestObjectResult("Employee not found");

        // STEP 3: GET LEAVE BALANCE

        var balance = await _context.EmployeeLeaveBalances

            .FirstOrDefaultAsync(b => b.Employee_Id == employee.Employee_Id);

        if (balance == null)

        {

            balance = new EmployeeLeaveBalance

            {

                Employee_Id = employee.Employee_Id

                // totals will use DB default values

            };

            _context.EmployeeLeaveBalances.Add(balance);

            await _context.SaveChangesAsync();

        }

        // STEP 4: RETURN DATA

        return new OkObjectResult(new

        {

            Earned = new

            {

                Total = balance.Earned_Total,

                Used = balance.Earned_Used,

                Remaining = balance.Earned_Total - balance.Earned_Used

            },

            Casual = new

            {

                Total = balance.Casual_Total,

                Used = balance.Casual_Used,

                Remaining = balance.Casual_Total - balance.Casual_Used

            },

            Sick = new

            {

                Total = balance.Sick_Total,

                Used = balance.Sick_Used,

                Remaining = balance.Sick_Total - balance.Sick_Used

            }

        });

    }
    public async Task<byte[]> ExportLeavesExcel()
    {
        var leaves = await _context.EmployeeLeaves
            .AsNoTracking()
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Employee Leaves");

        // Headers
        worksheet.Cell(1, 1).Value = "Employee ID";
        worksheet.Cell(1, 2).Value = "Employee Name";
        worksheet.Cell(1, 3).Value = "Leave Type";
        worksheet.Cell(1, 4).Value = "From Date";
        worksheet.Cell(1, 5).Value = "To Date";
        worksheet.Cell(1, 6).Value = "Reason";
        worksheet.Cell(1, 7).Value = "Status";
        worksheet.Cell(1, 8).Value = "Applied On";

        var headerRange = worksheet.Range(1, 1, 1, 8);
        headerRange.Style.Font.Bold = true;

        int row = 2;

        foreach (var leave in leaves)
        {
            worksheet.Cell(row, 1).Value = leave.EmployeeId;
            worksheet.Cell(row, 2).Value = leave.EmployeeName;
            worksheet.Cell(row, 3).Value = leave.LeaveType;
            worksheet.Cell(row, 4).Value = leave.FromDate;
            worksheet.Cell(row, 5).Value = leave.ToDate;
            worksheet.Cell(row, 6).Value = leave.Reason;
            worksheet.Cell(row, 7).Value = leave.Status;
            worksheet.Cell(row, 8).Value = leave.CreatedAt;

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return stream.ToArray();
    }


    public async Task<IActionResult> Delete(int id)

    {

        var leave = await _context.EmployeeLeaves.FindAsync(id);

        if (leave == null)

            return new NotFoundObjectResult("Leave not found");

        _context.EmployeeLeaves.Remove(leave);

        await _context.SaveChangesAsync();

        return new OkObjectResult("Leave deleted");

    }

    public async Task<IActionResult> CancelLeave(int id, ClaimsPrincipal user)

    {

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees

            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)

            return new BadRequestObjectResult("Employee not found");

        var leave = await _context.EmployeeLeaves

            .FirstOrDefaultAsync(l => l.Id == id && l.EmployeeId == employee.Employee_Id);

        if (leave == null)

            return new NotFoundObjectResult("Leave not found");

        if (leave.Status == "Rejected")

            return new BadRequestObjectResult("Already rejected");

        // 👉 If already approved → revert balance
        leave.Status = "Cancelled";

        await _context.SaveChangesAsync();

        await RecalculateLeaveBalance(employee.Employee_Id);

        return new OkObjectResult("Leave cancelled successfully");
       

        

    }

    private async Task<int> CalculateWorkingDays(DateTime fromDate, DateTime toDate)
    {
        int days = 0;

        for (var date = fromDate.Date; date <= toDate.Date; date = date.AddDays(1))
        {
            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
                continue;

            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == date.Date);

            if (isHoliday)
                continue;

            days++;
        }

        return days;
    }

    private async Task<int> CalculateSandwichLeaveDays(
    string employeeId,
    DateTime fromDate,
    DateTime toDate)
    {
        // CASE 1:
        // Count ALL days inside the selected leave range
        // (including weekends and holidays)

        int leaveDays = (toDate.Date - fromDate.Date).Days + 1;

        // CASE 2:
        // Check previous approved leave
        var previousLeave = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
                x.Status == "Approved" &&
                x.ToDate.Date < fromDate.Date)
            .OrderByDescending(x => x.ToDate)
            .FirstOrDefaultAsync();

        if (previousLeave != null)
        {
            var gapStart = previousLeave.ToDate.Date.AddDays(1);
            var gapEnd = fromDate.Date.AddDays(-1);

            if (gapStart <= gapEnd)
            {
                bool sandwichGap = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    bool isWeekend =
                        d.DayOfWeek == DayOfWeek.Saturday ||
                        d.DayOfWeek == DayOfWeek.Sunday;

                    bool isHoliday = await _context.Holidays
                        .AnyAsync(h => h.Holiday_Date.Date == d.Date);

                    if (!isWeekend && !isHoliday)
                    {
                        sandwichGap = false;
                        break;
                    }
                }

                if (sandwichGap)
                {
                    leaveDays += (gapEnd - gapStart).Days + 1;
                }
            }
        }

        // CASE 3:
        // Check next approved leave
        var nextLeave = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
                x.Status == "Approved" &&
                x.FromDate.Date > toDate.Date)
            .OrderBy(x => x.FromDate)
            .FirstOrDefaultAsync();

        if (nextLeave != null)
        {
            var gapStart = toDate.Date.AddDays(1);
            var gapEnd = nextLeave.FromDate.Date.AddDays(-1);

            if (gapStart <= gapEnd)
            {
                bool sandwichGap = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    bool isWeekend =
                        d.DayOfWeek == DayOfWeek.Saturday ||
                        d.DayOfWeek == DayOfWeek.Sunday;

                    bool isHoliday = await _context.Holidays
                        .AnyAsync(h => h.Holiday_Date.Date == d.Date);

                    if (!isWeekend && !isHoliday)
                    {
                        sandwichGap = false;
                        break;
                    }
                }

                if (sandwichGap)
                {
                    leaveDays += (gapEnd - gapStart).Days + 1;
                }
            }
        }

        return leaveDays;
    }
    private async Task RecalculateLeaveBalance(string employeeId)
    {
        var balance = await _context.EmployeeLeaveBalances
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (balance == null)
            return;

        balance.Casual_Used = 0;
        balance.Sick_Used = 0;
        balance.Earned_Used = 0;

        var approvedLeaves = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
                x.Status == "Approved")
            .ToListAsync();

        foreach (var leave in approvedLeaves)
        {
            int days = await CalculateSandwichLeaveDays(
                employeeId,
                leave.FromDate,
                leave.ToDate);

            switch (leave.LeaveType?.Trim().ToLower())
            {
                case "casual":
                    balance.Casual_Used += days;
                    break;

                case "sick":
                    balance.Sick_Used += days;
                    break;

                case "earned":
                case "earned leave":
                    balance.Earned_Used += days;
                    break;
            }
        }

        await _context.SaveChangesAsync();
    }
}

