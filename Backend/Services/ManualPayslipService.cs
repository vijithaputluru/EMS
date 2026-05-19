using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Globalization;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices;

namespace EmployeeManagementSystem.Services
{
    public class ManualPayslipService : IManualPayslipService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ManualPayslipService(
            AppDbContext context,
            IWebHostEnvironment env,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _env = env;
            _httpContextAccessor = httpContextAccessor;
        }

        //--------------------------------
        // GENERATE MANUAL PAYSLIP
        //--------------------------------
        public async Task<string> GenerateManualPaySlip(ManualPaySlipDto dto)
        {
            //--------------------------------
            // FETCH EMPLOYEE
            //--------------------------------
            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.BankDetails)
                .FirstOrDefaultAsync(e => e.Employee_Id == dto.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found");

            var personalInfo = await _context.EmployeePersonalInfos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Employee_Id == dto.EmployeeId);

            //--------------------------------
            // MONTH VALIDATION
            //--------------------------------
            if (!DateTime.TryParseExact(
                dto.Month.Trim(),
                "MMMM",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateTime parsedMonth))
            {
                throw new Exception($"Invalid month format: {dto.Month}");
            }

            int monthNumber = parsedMonth.Month;

            //--------------------------------
            // MANUAL INPUTS
            //--------------------------------
            int totalDaysInMonth = DateTime.DaysInMonth(dto.Year, monthNumber);

            // Your logic: total working days = actual days in month
            int totalWorkingDays = totalDaysInMonth;

            int lopDays = dto.LOPDays;

            if (lopDays < 0)
                throw new Exception("LOP days cannot be negative");

            if (lopDays > totalWorkingDays)
                throw new Exception("LOP cannot exceed working days");

            decimal paidDays = totalWorkingDays - lopDays;

            //--------------------------------
            // SALARY CALCULATIONS
            //--------------------------------
            decimal annualCTC = employee.CTC;

            decimal monthlyCTC = annualCTC / 12;

            decimal ratio = paidDays / totalWorkingDays;

            decimal basic = Math.Round((monthlyCTC * 0.3817m) * ratio);

            decimal hra = Math.Round(basic * 0.40m);

            decimal conveyance = Math.Round(1600 * ratio);

            decimal medical = Math.Round(1250 * ratio);

            decimal pf = Math.Round(basic * 0.12m);

            decimal gross = (monthlyCTC * ratio) - pf;

            decimal specialAllowance =
                gross - (basic + hra + conveyance + medical);

            decimal totalEarnings =
                basic + hra + conveyance + medical + specialAllowance;

            decimal professionalTax = 200;

            decimal totalDeductions =
                pf + professionalTax + dto.OtherDeductions;

            decimal netSalary =
                totalEarnings - totalDeductions;

            if (netSalary < 0)
                netSalary = 0;

            string netSalaryWords =
                NumberToWords((long)netSalary) + " Only";

            //--------------------------------
            // TEMPLATE AND OUTPUT PATH
            //--------------------------------
            var contentRoot = _env.ContentRootPath;

            var webRootPath = _env.WebRootPath
                ?? Path.Combine(contentRoot, "wwwroot");

            var templatePath = Path.Combine(
                contentRoot,
                "Templates",
                "PaySlipTemplate.docx");

            if (!File.Exists(templatePath))
                throw new Exception($"Template not found: {templatePath}");

            var outputFolder = Path.Combine(
                webRootPath,
                "GeneratedPayslips");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName =
                $"Payslip_{employee.Employee_Id}_{DateTime.Now:yyyyMMddHHmmss}.docx";

            var outputPath = Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            //--------------------------------
            // REPLACE WORD BOOKMARKS
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                ReplaceBookmark(wordDoc, "CandidateName", employee.Name ?? "-");

                ReplaceBookmark(wordDoc, "EmployeeID", employee.Employee_Id ?? "-");

                ReplaceBookmark(wordDoc, "Position", employee.RoleName ?? "-");

                ReplaceBookmark(wordDoc, "Department", employee.Department ?? "-");

                ReplaceBookmark(wordDoc, "Month", $"{dto.Month.ToUpper()} {dto.Year}");

                ReplaceBookmark(
                    wordDoc,
                    "JoiningDate",
                    employee.JoiningDate.ToString("dd/MM/yyyy"));

                ReplaceBookmark(
                    wordDoc,
                    "BankAccountNumber",
                    string.IsNullOrWhiteSpace(employee.BankDetails?.Account_Number)
                        ? "-"
                        : employee.BankDetails.Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "BankName",
                    string.IsNullOrWhiteSpace(employee.BankDetails?.Bank_Name)
                        ? "-"
                        : employee.BankDetails.Bank_Name);

                ReplaceBookmark(
                    wordDoc,
                    "UAN",
                    string.IsNullOrWhiteSpace(employee.BankDetails?.UAN_Number)
                        ? "-"
                        : employee.BankDetails.UAN_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PF",
                    string.IsNullOrWhiteSpace(employee.BankDetails?.PF_Account_Number)
                        ? "-"
                        : employee.BankDetails.PF_Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PAN",
                    string.IsNullOrWhiteSpace(personalInfo?.PanNumber)
                        ? "-"
                        : personalInfo.PanNumber);

                ReplaceBookmark(
                    wordDoc,
                    "Location",
                    string.IsNullOrWhiteSpace(personalInfo?.Location)
                        ? "Hyderabad"
                        : personalInfo.Location);

                //--------------------------------
                // EARNINGS
                //--------------------------------
                ReplaceBookmark(wordDoc, "Basic", basic.ToString("N0"));

                ReplaceBookmark(wordDoc, "HRA", hra.ToString("N0"));

                ReplaceBookmark(wordDoc, "ConveyanceAllowance", conveyance.ToString("N0"));

                ReplaceBookmark(wordDoc, "Medical", medical.ToString("N0"));

                ReplaceBookmark(wordDoc, "Special", specialAllowance.ToString("N0"));

                ReplaceBookmark(wordDoc, "TotalEarnings", totalEarnings.ToString("N0"));

                //--------------------------------
                // DEDUCTIONS
                //--------------------------------
                ReplaceBookmark(wordDoc, "PFAmount", pf.ToString("N0"));

                ReplaceBookmark(wordDoc, "ProfessionalTax", professionalTax.ToString("N0"));

                // Important:
                // Your previous manual service used "OtherDeduction"
                // Your auto service uses "OtherDeductions"
                // I am replacing both, so whichever bookmark exists will work.
                ReplaceBookmark(wordDoc, "OtherDeduction", dto.OtherDeductions.ToString("N0"));

                ReplaceBookmark(wordDoc, "OtherDeductions", dto.OtherDeductions.ToString("N0"));

                ReplaceBookmark(wordDoc, "TotalDeduction", totalDeductions.ToString("N0"));

                //--------------------------------
                // FINAL
                //--------------------------------
                ReplaceBookmark(wordDoc, "NetSalary", netSalary.ToString("N0"));

                ReplaceBookmark(wordDoc, "InWords", netSalaryWords);

                //--------------------------------
                // DAYS
                //--------------------------------
                ReplaceBookmark(wordDoc, "TotalWorkingDays", totalWorkingDays.ToString());

                ReplaceBookmark(wordDoc, "LOPDays", lopDays.ToString());

                ReplaceBookmark(wordDoc, "PaidDays", paidDays.ToString());
            }

            //--------------------------------
            // DOCX TO PDF
            //--------------------------------
            var pdfPath = outputPath.Replace(".docx", ".pdf");

            ConvertDocxToPdf(outputPath, pdfPath, outputFolder);

            if (!File.Exists(pdfPath))
                throw new Exception($"PDF generation failed. File not found: {pdfPath}");

            if (File.Exists(outputPath))
                File.Delete(outputPath);

            //--------------------------------
            // SAVE TO DB
            //--------------------------------
            var relativeFilePath = Path.Combine(
                    "GeneratedPayslips",
                    Path.GetFileName(pdfPath))
                .Replace("\\", "/");

            var payslip = new PaySlip
            {
                EmployeeId = employee.Employee_Id,
                CTC = employee.CTC,
                Month = dto.Month,
                Year = dto.Year,
                GrossSalary = gross,
                NetSalary = netSalary,
                TotalDeductions = totalDeductions,
                OtherDeductions = dto.OtherDeductions,

                // Store relative path, not Windows full path
                FilePath = relativeFilePath,

                Generated_On = DateTime.UtcNow
            };

            _context.PaySlips.Add(payslip);

            await _context.SaveChangesAsync();

            //--------------------------------
            // RETURN URL
            //--------------------------------
            var request = _httpContextAccessor.HttpContext?.Request;

            var baseUrl =
                request != null
                    ? $"{request.Scheme}://{request.Host}"
                    : "";

            var fileNameOnly = Path.GetFileName(pdfPath);

            return baseUrl + $"/GeneratedPayslips/{fileNameOnly}";
        }

        //--------------------------------
        // PDF CONVERSION
        //--------------------------------
        private void ConvertDocxToPdf(
      string docxPath,
      string pdfPath,
      string outputFolder)
        {
            if (!File.Exists(docxPath))
                throw new Exception($"DOCX file not found: {docxPath}");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var sofficePath =
                RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                    : "/usr/bin/soffice";

            var process = new Process();

            process.StartInfo.FileName = sofficePath;

            // SAME AS AUTO PAYSLIP SERVICE
            process.StartInfo.Arguments =
                $"--headless --convert-to pdf \"{docxPath}\" --outdir \"{outputFolder}\"";

            process.StartInfo.CreateNoWindow = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;

            process.Start();

            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();

            process.WaitForExit();

            if (process.ExitCode != 0)
            {
                throw new Exception(
                    $"LibreOffice PDF conversion failed. Output: {output}, Error: {error}");
            }

            if (!File.Exists(pdfPath))
            {
                throw new Exception(
                    $"PDF generation failed. Expected file not found: {pdfPath}. Output: {output}, Error: {error}");
            }
        }

        //--------------------------------
        // BOOKMARK HELPER
        //--------------------------------
        private void ReplaceBookmark(
            WordprocessingDocument doc,
            string bookmarkName,
            string text)
        {
            var bookmark = doc.MainDocumentPart?.RootElement?
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == bookmarkName);

            if (bookmark == null)
                return;

            var run = bookmark.NextSibling<Run>();

            if (run == null)
                return;

            var textElement = run.GetFirstChild<Text>();

            if (textElement != null)
            {
                textElement.Text = text ?? "-";
            }
            else
            {
                run.AppendChild(new Text(text ?? "-"));
            }
        }

        //--------------------------------
        // NUMBER TO WORDS
        //--------------------------------
        public static string NumberToWords(long number)
        {
            if (number == 0)
                return "Zero";

            string words = "";

            if ((number / 100000) > 0)
            {
                words += NumberToWords(number / 100000) + " Lakh ";
                number %= 100000;
            }

            if ((number / 1000) > 0)
            {
                words += NumberToWords(number / 1000) + " Thousand ";
                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words += NumberToWords(number / 100) + " Hundred ";
                number %= 100;
            }

            if (number > 0)
            {
                var unitsMap = new[]
                {
                    "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
                    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen",
                    "Sixteen","Seventeen","Eighteen","Nineteen"
                };

                var tensMap = new[]
                {
                    "Zero","Ten","Twenty","Thirty","Forty","Fifty",
                    "Sixty","Seventy","Eighty","Ninety"
                };

                if (number < 20)
                {
                    words += unitsMap[number];
                }
                else
                {
                    words += tensMap[number / 10];

                    if ((number % 10) > 0)
                    {
                        words += " " + unitsMap[number % 10];
                    }
                }
            }

            return words.Trim();
        }
    }
}