using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Diagnostics;

namespace EmployeeManagementSystem.Services
{
    public class OfferLetterService : IOfferLetterService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public OfferLetterService(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<OfferLetterResponseDto> GenerateAsync(OfferLetterRequestDto dto)
        {
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "OfferLetterTemplates.docx");

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "GeneratedLetters");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName = $"OfferLetter_{dto.Candidate_Name}_{DateTime.Now:yyyyMMddHHmmss}.docx";
            var outputPath = Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            // =============================
            // Salary Calculations
            // =============================

            //decimal annualCTC = dto.CTC_Annual;
            //decimal monthlyCTC = annualCTC / 12;

            //decimal basic = Math.Round(monthlyCTC * 0.40m, 2);
            //decimal basicYearly = basic * 12;

            //decimal hra = Math.Round(basic * 0.40m, 2);
            //decimal hraYearly = hra * 12;

            //decimal conveyance = 1600;
            //decimal conveyanceYearly = conveyance * 12;

            //decimal medicalAllowance = 1250;
            //decimal medicalAllowanceYearly = medicalAllowance * 12;

            //decimal employerPfMonthly = Math.Round(basic * 0.12m, 2);
            //decimal employerPfAnnual = employerPfMonthly * 12;

            //decimal gross = monthlyCTC - employerPfMonthly;
            //decimal grossYearly = gross * 12;

            //decimal otherAllowance = Math.Round(
            //    gross - (basic + hra + conveyance + medicalAllowance), 2);

            //decimal otherAllowanceYearly = otherAllowance * 12;

            //decimal providentfundMonthly = employerPfMonthly;
            //decimal providentfundAnnual = providentfundMonthly * 12;

            //decimal professionaltaxMonthly = 200;
            //decimal professionaltaxAnnual = professionaltaxMonthly * 12;

            //decimal netMonthly = gross - (providentfundMonthly + professionaltaxMonthly);
            //decimal netAnnual = netMonthly * 12;



            //decimal annualCTC = dto.CTC_Annual;
            //decimal monthlyCTC = Math.Round(annualCTC / 12, 2);

            //// =======================
            //// EARNINGS
            //// =======================

            //// Basic (38.17% of CTC)
            //decimal basic = Math.Round(monthlyCTC * 0.3817m, 2);
            //decimal basicYearly = basic * 12;

            //// HRA (40% of Basic)
            //decimal hra = Math.Round(basic * 0.40m, 2);
            //decimal hraYearly = hra * 12;

            //// Fixed components
            //decimal conveyance = 1600;
            //decimal conveyanceYearly = conveyance * 12;

            //decimal medicalAllowance = 1250;
            //decimal medicalAllowanceYearly = medicalAllowance * 12;

            //// =======================
            //// PF (Employer Contribution)
            //// =======================

            //// 12% of Basic
            //decimal employerPfMonthly = Math.Round(basic * 0.12m, 2);
            //decimal employerPfAnnual = employerPfMonthly * 12;

            //// =======================
            //// GROSS SALARY
            //// =======================

            //// Gross = CTC - Employer PF
            //decimal gross = Math.Round(monthlyCTC - employerPfMonthly, 2);
            //decimal grossYearly = gross * 12;

            //// =======================
            //// OTHER ALLOWANCE (Balancing)
            //// =======================

            //decimal otherAllowance = Math.Round(
            //    gross - (basic + hra + conveyance + medicalAllowance), 2);

            //decimal otherAllowanceYearly = otherAllowance * 12;

            //// =======================
            //// DEDUCTIONS (for display only)
            //// =======================

            //// Employee PF (same as employer PF)
            //decimal providentfundMonthly = employerPfMonthly;
            //decimal providentfundAnnual = providentfundMonthly * 12;

            //// Professional Tax
            //decimal professionaltaxMonthly = 200;
            //decimal professionaltaxAnnual = professionaltaxMonthly * 12;

            //// =======================
            //// NET TAKE HOME
            //// =======================

            //decimal netMonthly = gross - (providentfundMonthly + professionaltaxMonthly);
            //decimal netAnnual = netMonthly * 12;


            //decimal annualCTC = dto.CTC_Annual;
            //decimal monthlyCTC = Math.Round(annualCTC / 12, 2);

            //// ======================================
            //// TAKE VALUES FROM FRONTEND OR DEFAULTS
            //// ======================================

            //decimal basic =
            //    dto.Basic ??
            //    Math.Round(monthlyCTC * 0.40m, 2);

            //decimal hra =
            //    dto.HRA ??
            //    Math.Round(basic * 0.40m, 2);

            //decimal conveyance =
            //    dto.Conveyance ?? 1600;

            //decimal medicalAllowance =
            //    dto.MedicalAllowance ?? 1250;

            //// ======================================
            //// EMPLOYER PF
            //// ======================================

            //decimal employerPfMonthly =
            //    Math.Round(basic * 0.12m, 2);

            //decimal employerPfAnnual =
            //    employerPfMonthly * 12;

            //// ======================================
            //// EARNINGS WITHOUT OTHER ALLOWANCE
            //// ======================================

            //decimal earnings =
            //    basic +
            //    hra +
            //    conveyance +
            //    medicalAllowance;

            //// ======================================
            //// OTHER ALLOWANCE
            //// BALANCE TOTAL CTC
            //// ======================================

            //decimal otherAllowance =
            //    dto.OtherAllowance ??
            //    (
            //        monthlyCTC -
            //        (
            //            earnings +
            //            employerPfMonthly
            //        )
            //    );

            //otherAllowance =
            //    Math.Round(otherAllowance, 2);

            //// ======================================
            //// FINAL GROSS
            //// ======================================

            //decimal gross =
            //    earnings +
            //    otherAllowance;

            //decimal grossYearly =
            //    gross * 12;

            //// ======================================
            //// DEDUCTIONS
            //// ======================================

            //decimal professionaltaxMonthly = 200;

            //decimal professionaltaxAnnual =
            //    professionaltaxMonthly * 12;

            //decimal providentfundMonthly =
            //    employerPfMonthly;

            //decimal providentfundAnnual =
            //    providentfundMonthly * 12;

            //// ======================================
            //// NET TAKE HOME
            //// ======================================

            //decimal netMonthly =
            //    gross -
            //    (
            //        providentfundMonthly +
            //        professionaltaxMonthly
            //    );

            //decimal netAnnual =
            //    netMonthly * 12;

            //// ======================================
            //// YEARLY VALUES
            //// ======================================

            //decimal basicYearly =
            //    basic * 12;

            //decimal hraYearly =
            //    hra * 12;

            //decimal conveyanceYearly =
            //    conveyance * 12;

            //decimal medicalAllowanceYearly =
            //    medicalAllowance * 12;

            //decimal otherAllowanceYearly =
            //    otherAllowance * 12;
            //// =======================
            //// YEARLY VALUES
            //// =======================

            ////decimal basicYearly = basic * 12;
            ////decimal hraYearly = hra * 12;
            ////decimal conveyanceYearly = conveyance * 12;
            ////decimal medicalAllowanceYearly = medicalAllowance * 12;
            ////decimal otherAllowanceYearly = otherAllowance * 12;
            ///

            //decimal annualCTC = dto.CTC_Annual;
            //decimal monthlyCTC = Math.Round(annualCTC / 12, 2);

            //// ======================================
            //// TAKE VALUES FROM FRONTEND
            //// ======================================

            //decimal basic =
            //    dto.Basic ??
            //    Math.Round(monthlyCTC * 0.40m, 2);

            //decimal hra =
            //    dto.HRA ??
            //    Math.Round(basic * 0.40m, 2);

            //decimal conveyance =
            //    dto.Conveyance ?? 1600;

            //decimal medicalAllowance =
            //    dto.MedicalAllowance ?? 1250;

            //// ======================================
            //// EMPLOYER PF
            //// ======================================

            //decimal employerPfMonthly =
            //    Math.Round(basic * 0.12m, 2);

            //decimal employerPfAnnual =
            //    employerPfMonthly * 12;

            //// ======================================
            //// FIXED EARNINGS
            //// ======================================

            //decimal earnings =
            //    basic +
            //    hra +
            //    conveyance +
            //    medicalAllowance;

            //// ======================================
            //// AUTO BALANCING OTHER ALLOWANCE
            //// ======================================

            //decimal otherAllowance =
            //    monthlyCTC -
            //    (
            //        earnings +
            //        employerPfMonthly
            //    );

            //otherAllowance =
            //    Math.Round(otherAllowance, 2);

            //// ======================================
            //// FINAL GROSS
            //// ======================================

            //decimal gross =
            //    earnings +
            //    otherAllowance;

            //decimal grossYearly =
            //    gross * 12;

            //// ======================================
            //// DEDUCTIONS
            //// ======================================

            //decimal professionaltaxMonthly = 200;

            //decimal professionaltaxAnnual =
            //    professionaltaxMonthly * 12;

            //decimal providentfundMonthly =
            //    employerPfMonthly;

            //decimal providentfundAnnual =
            //    providentfundMonthly * 12;

            //// ======================================
            //// NET TAKE HOME
            //// ======================================

            //decimal netMonthly =
            //    gross -
            //    (
            //        providentfundMonthly +
            //        professionaltaxMonthly
            //    );

            //decimal netAnnual =
            //    netMonthly * 12;

            // ======================================
            // YEARLY VALUES
            // ======================================

            decimal annualCTC = dto.CTC_Annual;

            decimal monthlyCTC =
                Math.Round(annualCTC / 12, 2);

            // ======================================
            // FIXED GROSS FROM CTC
            // ======================================

            // Original backend PF calculation basis
            decimal backendBasic =
                Math.Round(monthlyCTC * 0.3817m, 2);

            // Fixed employer PF from backend logic
            decimal fixedEmployerPf =
                Math.Round(backendBasic * 0.12m, 2);

            // FIXED GROSS
            decimal gross =
                monthlyCTC - fixedEmployerPf;

            decimal grossYearly =
                gross * 12;

            // ======================================
            // FRONTEND VALUES
            // ======================================

            decimal basic =
                dto.Basic ?? backendBasic;

            decimal hra =
                dto.HRA ??
                Math.Round(basic * 0.40m, 2);

            decimal conveyance =
                dto.Conveyance ?? 1600;

            decimal medicalAllowance =
                dto.MedicalAllowance ?? 1250;

            // ======================================
            // PF SHOULD CHANGE FROM EDITED BASIC
            // ======================================

            decimal employerPfMonthly =
                Math.Round(basic * 0.12m, 2);

            decimal employerPfAnnual =
                employerPfMonthly * 12;

            // ======================================
            // OTHER ALLOWANCE AUTO BALANCING
            // ======================================

            decimal otherAllowance =
                gross -
                (
                    basic +
                    hra +
                    conveyance +
                    medicalAllowance
                );

            otherAllowance =
                otherAllowance -
                (
                    employerPfMonthly -
                    fixedEmployerPf
                );

            otherAllowance =
                Math.Round(otherAllowance, 2);

            // ======================================
            // DEDUCTIONS
            // ======================================

            decimal professionaltaxMonthly = 200;

            decimal professionaltaxAnnual =
                professionaltaxMonthly * 12;

            decimal providentfundMonthly =
                employerPfMonthly;

            decimal providentfundAnnual =
                providentfundMonthly * 12;

            // ======================================
            // NET TAKE HOME
            // ======================================

            decimal netMonthly =
                gross -
                (
                    providentfundMonthly +
                    professionaltaxMonthly
                );

            decimal netAnnual =
                netMonthly * 12;

            // ======================================
            // YEARLY VALUES
            // ======================================

            decimal basicYearly =
                basic * 12;

            decimal hraYearly =
                hra * 12;

            decimal conveyanceYearly =
                conveyance * 12;

            decimal medicalAllowanceYearly =
                medicalAllowance * 12;

            decimal otherAllowanceYearly =
                otherAllowance * 12;

            //decimal basicYearly = basic * 12;
            //decimal hraYearly = hra * 12;
            //decimal conveyanceYearly = conveyance * 12;
            //decimal medicalAllowanceYearly = medicalAllowance * 12;
            //decimal otherAllowanceYearly = otherAllowance * 12;

            // =============================
            // Replace Bookmarks
            // =============================

            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                var joiningDate = dto.Joining_Date.ToString("dd MMM yyyy");

                ReplaceBookmark(wordDoc, "Date", DateTime.Now.ToString("dd MMM yyyy"));
                ReplaceBookmark(wordDoc, "CandidateName", dto.Candidate_Name);
                ReplaceBookmark(wordDoc, "Address", dto.Address); // ✅ multi-line supported
                ReplaceBookmark(wordDoc, "JoiningDate", joiningDate);
                ReplaceBookmark(wordDoc, "DateOfJoining", joiningDate);
                ReplaceBookmark(wordDoc, "Position", dto.Position);

                ReplaceBookmark(wordDoc, "CTCAnnual",
                   annualCTC.ToString("N2", new CultureInfo("en-IN")) + "/-");

                ReplaceBookmark(wordDoc, "MonthlySalary",
                    monthlyCTC.ToString("N2", new CultureInfo("en-IN")) + "/-");

                ReplaceBookmark(wordDoc, "Basic", basic.ToString("N2"));
                ReplaceBookmark(wordDoc, "BasicYearly", basicYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "HRA", hra.ToString("N2"));
                ReplaceBookmark(wordDoc, "HRAYearly", hraYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "Conveyance", conveyance.ToString("N2"));
                ReplaceBookmark(wordDoc, "ConveyanceYearly", conveyanceYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "MedicalAllowance", medicalAllowance.ToString("N2"));
                ReplaceBookmark(wordDoc, "MedicalAllowanceYearly", medicalAllowanceYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "OtherAllowance", otherAllowance.ToString("N2"));
                ReplaceBookmark(wordDoc, "OtherAllowanceYearly", otherAllowanceYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "Gross", gross.ToString("N2"));
                ReplaceBookmark(wordDoc, "GrossYearly", grossYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "Gross1", gross.ToString("N2"));
                ReplaceBookmark(wordDoc, "GrossYearly1", grossYearly.ToString("N2"));

                ReplaceBookmark(wordDoc, "ProfessionalTax", professionaltaxMonthly.ToString("N2"));
                ReplaceBookmark(wordDoc, "ProfessionalTaxYearly", professionaltaxAnnual.ToString("N2"));

                ReplaceBookmark(wordDoc, "ProvidentFund", providentfundMonthly.ToString("N2"));
                ReplaceBookmark(wordDoc, "ProvidentFundYearly", providentfundAnnual.ToString("F0"));

                ReplaceBookmark(wordDoc, "NetTakeHome", netMonthly.ToString("N2"));
                ReplaceBookmark(wordDoc, "NetTakeHomeYearly", netAnnual.ToString("N2"));

                ReplaceBookmark(wordDoc, "ProvidentFund1", employerPfMonthly.ToString("N2"));
                ReplaceBookmark(wordDoc, "ProvidentFund1Yearly", employerPfAnnual.ToString("N2"));

                ReplaceBookmark(wordDoc, "MonthlyCTC", monthlyCTC.ToString("N2"));
                ReplaceBookmark(wordDoc, "CTCAnnual1", annualCTC.ToString("N2"));
            }

            // =============================
            // Convert DOCX to PDF
            // =============================

            var pdfPath = outputPath.Replace(".docx", ".pdf");

           var process = new Process();
 
var sofficePath = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)

    ? @"C:\Program Files\LibreOffice\program\soffice.exe"

    : "/usr/bin/soffice";
 
var fontPath = Path.Combine(

    Directory.GetCurrentDirectory(),

    "Fonts"

);
 
process.StartInfo.FileName = sofficePath;
 
// IMPORTANT FOR LINUX FONT RENDERING

process.StartInfo.EnvironmentVariables["FONTCONFIG_PATH"] = fontPath;
 
process.StartInfo.Arguments =

    $"--headless --nologo --nofirststartwizard " +

    $"--convert-to pdf \"{outputPath}\" " +

    $"--outdir \"{outputFolder}\"";
 
process.StartInfo.RedirectStandardOutput = true;

process.StartInfo.RedirectStandardError = true;

process.StartInfo.UseShellExecute = false;

process.StartInfo.CreateNoWindow = true;
 
process.Start();
 
string output = await process.StandardOutput.ReadToEndAsync();

string error = await process.StandardError.ReadToEndAsync();
 
process.WaitForExit();
 
if (process.ExitCode != 0)

{

    throw new Exception(

        $"LibreOffice PDF conversion failed.\n" +

        $"Output: {output}\n" +

        $"Error: {error}"

    );

}
 
            if (!File.Exists(pdfPath))
            {
                throw new Exception("PDF generation failed. LibreOffice not installed or wrong path.");
            }
            if (File.Exists(outputPath))
                File.Delete(outputPath);

            // =============================
            // Send Email
            // =============================

            await _emailService.SendEmailWithAttachment(
                dto.Email,
                "Offer Letter - EMS",
                "Dear Candidate,\n\nPlease find attached your offer letter.\n\nRegards,\nHR Team",
                pdfPath);

            // =============================
            // Save Record
            // =============================

            var offerLetter = new OfferLetter
            {
                Candidate_Name = dto.Candidate_Name,
                Email = dto.Email,
                Address = dto.Address,
                Position = dto.Position,
                Joining_Date = dto.Joining_Date,
                CTC_Annual = dto.CTC_Annual,
                Generated_On = DateTime.UtcNow,
                File_Path = pdfPath
            };

            _context.OfferLetters.Add(offerLetter);
            await _context.SaveChangesAsync();

            return new OfferLetterResponseDto
            {
                Success = true,
                Message = "Offer letter generated and sent successfully."
            };
        }

        // =============================
        // FIXED BOOKMARK METHOD
        // =============================

        private void ReplaceBookmark(
      WordprocessingDocument doc,
      string bookmarkName,
      string text)
        {
            var bookmark = doc.MainDocumentPart.RootElement
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == bookmarkName);

            if (bookmark == null) return;

            var run = bookmark.NextSibling<Run>();
            if (run == null) return;

            // 🔥 ADDRESS MULTI-LINE FIX
            if (bookmarkName == "Address")
            {
                var rawLines = text
                    .Replace("\r", "")
                    .Split(new[] { ',', '\n' });

                var lines = rawLines
                    .Select(x => x.Trim())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();

                run.RemoveAllChildren<Text>();

                for (int i = 0; i < lines.Count; i++)
                {
                    string value = lines[i];

                    if (i < lines.Count - 1)
                        value += ",";

                    run.Append(new Text(value));

                    if (i < lines.Count - 1)
                        run.Append(new Break());
                }
            }
            else
            {
                // ✅ FIXED
                run.RemoveAllChildren<Text>();
                run.Append(new Text(text));
            }
        }
    }
}

