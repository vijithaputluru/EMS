using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using OfficeOpenXml.Drawing;
using System.Drawing;

namespace EmployeeManagementSystem.Services
{
    public class AssetService : IAssetService
    {
        private readonly IUserNotificationService _notificationService;
        private readonly AppDbContext _context;

        public AssetService(
            AppDbContext context,
            IUserNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // ================= CREATE ASSET =================
        public async Task<string> CreateAsset(AssetDto dto)
        {
            var imagePaths = new List<string>();

            if (dto.Images != null && dto.Images.Count > 0)
            {
                foreach (var image in dto.Images)
                {
                    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(image.FileName);
                    var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/assets");

                    if (!Directory.Exists(folder))
                        Directory.CreateDirectory(folder);

                    var filePath = Path.Combine(folder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await image.CopyToAsync(stream);
                    }

                    imagePaths.Add("/uploads/assets/" + fileName);
                }
            }

            var asset = new Asset
            {
                AssetName = dto.AssetName,
                SerialNo = dto.SerialNo,
                Status = dto.Status ?? "Available",
                AssignedTo = dto.AssignedTo,
                CreatedAt = DateTime.UtcNow,
                ImagePaths = string.Join(",", imagePaths),
                Description = dto.Description
            };

            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            return "Asset created successfully";
        }

        // ================= GET ALL =================
        public async Task<List<Asset>> GetAllAssets()
        {
            return await _context.Assets.ToListAsync();
        }

        // ================= GET BY ID =================
        public async Task<Asset?> GetAssetById(int id)
        {
            return await _context.Assets.FindAsync(id);
        }

        // ================= UPDATE =================
        public async Task<string> UpdateAsset(int id, AssetDto dto)
        {
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)
                return "Asset not found";

            var imagePaths = new List<string>();

            // Keep old images
            if (!string.IsNullOrWhiteSpace(dto.ExistingImages))
            {
                imagePaths = dto.ExistingImages
                    .Split(",", StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();
            }

            // Add newly uploaded images
            if (dto.Images != null && dto.Images.Count > 0)
            {
                foreach (var image in dto.Images)
                {
                    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(image.FileName);
                    var folder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/assets");

                    if (!Directory.Exists(folder))
                        Directory.CreateDirectory(folder);

                    var filePath = Path.Combine(folder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await image.CopyToAsync(stream);
                    }

                    imagePaths.Add("/uploads/assets/" + fileName);
                }
            }

            asset.AssetName = dto.AssetName;
            asset.SerialNo = dto.SerialNo;
            asset.Status = dto.Status ?? "Available";
            asset.Description = dto.Description;

            // Only changed this logic:
            // Previously employee id was saved only for Assigned status.
            // Now it saves for Assigned, Under Repair, and Available also.
            asset.AssignedTo = dto.AssignedTo;

            asset.ImagePaths = string.Join(",", imagePaths);

            await _context.SaveChangesAsync();

            return "Asset updated successfully";
        }

        // ================= ASSIGN ASSET =================
        public async Task<string> AssignAsset(int id, string employeeId)
        {
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)
                return "Asset not found";

            asset.AssignedTo = employeeId;
            asset.Status = "Assigned";

            await _context.SaveChangesAsync();

            return "Asset assigned successfully";
        }

        // ================= RETURN ASSET =================
        public async Task<string> ReturnAsset(int id)
        {
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)
                return "Asset not found";

            asset.AssignedTo = null;
            asset.Status = "Available";

            await _context.SaveChangesAsync();

            return "Asset returned successfully";
        }

        // ================= DELETE =================
        public async Task<string> DeleteAsset(int id)
        {
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null)
                return "Asset not found";

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();

            return "Asset deleted successfully";
        }

        public async Task<byte[]> ExportAssetsExcel()
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            var assets = await _context.Assets.ToListAsync();

            using var package = new ExcelPackage();
            var sheet = package.Workbook.Worksheets.Add("Assets");

            // Headers
            sheet.Cells[1, 1].Value = "Asset Name";
            sheet.Cells[1, 2].Value = "Serial No";
            sheet.Cells[1, 3].Value = "Status";
            sheet.Cells[1, 4].Value = "Assigned To";
            sheet.Cells[1, 5].Value = "Description";
            sheet.Cells[1, 6].Value = "Created Date";
            sheet.Cells[1, 7].Value = "Images";

            int row = 2;

            foreach (var asset in assets)
            {
                sheet.Cells[row, 1].Value = asset.AssetName;
                sheet.Cells[row, 2].Value = asset.SerialNo;
                sheet.Cells[row, 3].Value = asset.Status;
                sheet.Cells[row, 4].Value = asset.AssignedTo;
                sheet.Cells[row, 5].Value = asset.Description;
                sheet.Cells[row, 6].Value = asset.CreatedAt.ToString("dd-MM-yyyy");

                sheet.Row(row).Height = 90;

                if (!string.IsNullOrEmpty(asset.ImagePaths))
                {
                    var images = asset.ImagePaths
                        .Split(',', StringSplitOptions.RemoveEmptyEntries);

                    int imageColOffset = 0;

                    foreach (var imagePath in images)
                    {
                        var physicalPath = Path.Combine(
                            Directory.GetCurrentDirectory(),
                            "wwwroot",
                            imagePath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())
                        );

                        if (File.Exists(physicalPath))
                        {
                            var picture = sheet.Drawings.AddPicture(
                                Guid.NewGuid().ToString(),
                                new FileInfo(physicalPath));

                            picture.SetPosition(row - 1, 5, 6 + imageColOffset, 5);
                            picture.SetSize(80, 80);

                            imageColOffset++;
                        }
                    }
                }

                row++;
            }
            sheet.Cells.AutoFitColumns();

            return package.GetAsByteArray();
        }

    }
    }
