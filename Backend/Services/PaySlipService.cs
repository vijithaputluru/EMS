using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;

namespace EmployeeManagementSystem.Services
{
    public class PaySlipService : IPaySlipService
    {
        private readonly AppDbContext _context;
        private readonly IAttendanceService _attendanceService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PaySlipService(
            AppDbContext context,
            IAttendanceService attendanceService,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _attendanceService = attendanceService;
            _httpContextAccessor = httpContextAccessor;
        }

        //--------------------------------
        // GENERATE SINGLE PAYSLIP
        //--------------------------------
        public async Task<string> GeneratePaySlip(
            string employeeId,
            int year,
            string month,
            decimal OtherDeductions)
        {
            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.BankDetails)
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found");

            var personalInfo = await _context.EmployeePersonalInfos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

            //--------------------------------
            // MONTH
            //--------------------------------
            if (!DateTime.TryParseExact(
                month.Trim(),
                "MMMM",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateTime parsedMonth))
            {
                throw new Exception($"Invalid month format: {month}");
            }

            int monthNumber = parsedMonth.Month;
            int yearValue = year;

            //--------------------------------
            // ATTENDANCE
            //--------------------------------
            var summary = await _attendanceService
                .GetMonthlyAttendanceSummary(
                    employee.Employee_Id,
                    monthNumber,
                    yearValue);

            int absentDays = summary.AbsentDays;

            decimal presentDays = summary.PresentDays;

            int totalDaysInMonth =
                DateTime.DaysInMonth(yearValue, monthNumber);

            int weekendDays =
                (int)(totalDaysInMonth -
                (presentDays + absentDays));

            int totalWorkingDays =
                (int)(presentDays + absentDays + weekendDays);

            int lopDays = absentDays;

            decimal paidDays =
                presentDays + weekendDays;

            //--------------------------------
            // SALARY CALCULATIONS
            //--------------------------------
            decimal annualCTC = employee.CTC;

            decimal monthlyCTC = annualCTC / 12;

            decimal ratio =
                (decimal)paidDays / totalDaysInMonth;

            decimal basic =
                Math.Round((monthlyCTC * 0.3817m) * ratio);

            decimal hra =
                Math.Round((basic * 0.40m));

            decimal conveyance =
                Math.Round(1600 * ratio);

            decimal medical =
                Math.Round(1250 * ratio);

            decimal pf =
                Math.Round(basic * 0.12m);

            decimal gross =
                (monthlyCTC * ratio) - pf;

            decimal specialAllowance =
                gross -
                (basic + hra + conveyance + medical);

            decimal totalEarnings =
                basic +
                hra +
                conveyance +
                medical +
                specialAllowance;

            decimal professionalTax = 200;

            decimal totalDeductions =
                pf +
                professionalTax +
                OtherDeductions;

            decimal netSalary =
                totalEarnings - totalDeductions;

            if (netSalary < 0)
                netSalary = 0;

            string netSalaryWords =
                NumberToWords((long)netSalary) + " Only";

            //--------------------------------
            // TEMPLATE
            //--------------------------------
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "PaySlipTemplate.docx");

            if (!File.Exists(templatePath))
                throw new Exception(
                    $"Template not found: {templatePath}");

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "GeneratedPayslips");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName =
    $"Payslip_{employee.Employee_Id}_{GetIndianTime():yyyyMMddHHmmss}.docx";

            var outputPath =
                Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            //--------------------------------
            // REPLACE BOOKMARKS
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                var candidateName = personalInfo == null
    ? "-"
    : $"{personalInfo.FirstName} {personalInfo.LastName}".Trim();

                if (string.IsNullOrWhiteSpace(candidateName))
                    candidateName = "-";

                ReplaceBookmark(
                    wordDoc,
                    "CandidateName",
                    candidateName);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeID",
                    employee.Employee_Id ?? "-");

                ReplaceBookmark(
                   wordDoc,
                   "Position",
                   string.IsNullOrWhiteSpace(
                       personalInfo?.Designation)
                   ? "-"
                   : personalInfo.Designation);

                ReplaceBookmark(
                    wordDoc,
                    "Department",
                    employee.Department ?? "-");

                ReplaceBookmark(
                    wordDoc,
                    "Month",
                    $"{month.ToUpper()} {year}");

                ReplaceBookmark(
                    wordDoc,
                    "Month1",
                    $"{month} {year}");

                ReplaceBookmark(
                    wordDoc,
                    "BankAccountNumber",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.Account_Number)
                    ? "-"
                    : employee.BankDetails.Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "BankName",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.Bank_Name)
                    ? "-"
                    : employee.BankDetails.Bank_Name);

                ReplaceBookmark(
                    wordDoc,
                    "UAN",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.UAN_Number)
                    ? "-"
                    : employee.BankDetails.UAN_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PF",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.PF_Account_Number)
                    ? "-"
                    : employee.BankDetails.PF_Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PAN",
                    string.IsNullOrWhiteSpace(
                        personalInfo?.PanNumber)
                    ? "-"
                    : personalInfo.PanNumber);

                ReplaceBookmark(
                     wordDoc,
                    "Location",
                    "Hyderabad");

                ReplaceBookmark(
                    wordDoc,
                    "JoiningDate",
                    employee.JoiningDate
                        .ToString("dd/MM/yyyy"));

                //--------------------------------
                // EARNINGS
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "Basic",
                    basic.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "HRA",
                    hra.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "ConveyanceAllowance",
                    conveyance.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "Medical",
                    medical.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "Special",
                    specialAllowance.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "TotalEarnings",
                    totalEarnings.ToString("N2"));

                //--------------------------------
                // DEDUCTIONS
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "PFAmount",
                    pf.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "ProfessionalTax",
                    professionalTax.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "OtherDeductions",
                    OtherDeductions.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "TotalDeduction",
                    totalDeductions.ToString("N2"));

                //--------------------------------
                // FINAL
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "NetSalary",
                    netSalary.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "InWords",
                    netSalaryWords);

                //--------------------------------
                // ATTENDANCE
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "TotalWorkingDays",
                    totalWorkingDays.ToString());

                ReplaceBookmark(
                    wordDoc,
                    "LOPDays",
                    lopDays.ToString());

                ReplaceBookmark(
                    wordDoc,
                    "PaidDays",
                    paidDays.ToString());
            }

            //--------------------------------
            // DOCX → PDF
            //--------------------------------
            //--------------------------------
            // DOCX → PDF
            //--------------------------------
            var pdfPath =
                outputPath.Replace(".docx", ".pdf");

            var sofficePath =
                RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                : "/usr/bin/soffice";

            using var process = new Process();

            process.StartInfo.FileName = sofficePath;

            process.StartInfo.Arguments =
                $"--headless --convert-to pdf \"{outputPath}\" --outdir \"{outputFolder}\"";

            process.StartInfo.CreateNoWindow = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;

            process.Start();

            await process.WaitForExitAsync();

            if (!File.Exists(pdfPath))
            {
                string error = await process.StandardError.ReadToEndAsync();

                throw new Exception(
                    $"PDF generation failed. {error}");
            }

            if (File.Exists(outputPath))
                File.Delete(outputPath);
            
            //--------------------------------
            // SAVE DB
            //--------------------------------
            var payslip = new PaySlip
            {
                EmployeeId = employee.Employee_Id,
                Month = month,
                Year = year,
                CTC=employee.CTC,
                GrossSalary = gross,
                NetSalary = netSalary,
                TotalDeductions = totalDeductions,
                OtherDeductions = OtherDeductions,
                FilePath = pdfPath,
                Generated_On = GetIndianTime()
            };

            _context.PaySlips.Add(payslip);

            await _context.SaveChangesAsync();

            //--------------------------------
            // RETURN URL
            //--------------------------------
            var request =
                _httpContextAccessor.HttpContext?.Request;

            var baseUrl =
                request != null
                ? $"{request.Scheme}://{request.Host}"
                : "";

            var fileNameOnly =
                Path.GetFileName(pdfPath);

            return baseUrl +
                   $"/GeneratedPayslips/{fileNameOnly}";
        }

        //--------------------------------
        // BULK GENERATION
        //--------------------------------
        public async Task<List<string>>
            GenerateAllPaySlips(int year, string month)
        {
            var employeeIds = await _context.Employees
                .AsNoTracking()
                .Select(e => e.Employee_Id)
                .ToListAsync();

            var result = new List<string>();

            foreach (var empId in employeeIds)
            {
                var filePath =
                    await GeneratePaySlip(
                        empId,
                        year,
                        month,
                        0);

                result.Add(filePath);
            }

            return result;
        }

        //--------------------------------
        // GET RECENT
        //--------------------------------
        public async Task<List<PaySlip>>
            GetRecentPayslips()
        {
            return await _context.PaySlips
                .OrderByDescending(x => x.Id)
                .ToListAsync();
        }

        //--------------------------------
        // BOOKMARK REPLACE
        //--------------------------------
        private void ReplaceBookmark(
            WordprocessingDocument doc,
            string name,
            string text)
        {
            var bookmark =
                doc.MainDocumentPart.RootElement
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == name);

            if (bookmark != null)
            {
                var run =
                    bookmark.NextSibling<Run>();

                if (run != null)
                {
                    run.RemoveAllChildren<Text>();

                    run.Append(
                        new Text(text ?? "-"));
                }
            }
        }

        //--------------------------------
        // NUMBER TO WORDS
        //--------------------------------
        private DateTime GetIndianTime()
        {
            TimeZoneInfo indiaZone =
                TimeZoneInfo.FindSystemTimeZoneById(
                    RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? "India Standard Time"
                    : "Asia/Kolkata");

            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                indiaZone);
        }

        public static string NumberToWords(
            long number)
        {
            if (number == 0)
                return "Zero";

            string words = "";

            if ((number / 100000) > 0)
            {
                words +=
                    NumberToWords(number / 100000)
                    + " Lakh ";

                number %= 100000;
            }

            if ((number / 1000) > 0)
            {
                words +=
                    NumberToWords(number / 1000)
                    + " Thousand ";

                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words +=
                    NumberToWords(number / 100)
                    + " Hundred ";

                number %= 100;
            }

            if (number > 0)
            {
                var units = new[]
                {
                    "Zero","One","Two","Three",
                    "Four","Five","Six","Seven",
                    "Eight","Nine","Ten",
                    "Eleven","Twelve","Thirteen",
                    "Fourteen","Fifteen",
                    "Sixteen","Seventeen",
                    "Eighteen","Nineteen"
                };

                var tens = new[]
                {
                    "Zero","Ten","Twenty",
                    "Thirty","Forty","Fifty",
                    "Sixty","Seventy",
                    "Eighty","Ninety"
                };

                if (number < 20)
                {
                    words += units[number];
                }
                else
                {
                    words += tens[number / 10];

                    if ((number % 10) > 0)
                    {
                        words +=
                            " " +
                            units[number % 10];
                    }
                }
            }

            return words;
        }
    }
}