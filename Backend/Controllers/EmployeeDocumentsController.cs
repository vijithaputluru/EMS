using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeDocumentsController : ControllerBase
    {
        private readonly IEmployeeDocumentService _service;

        public EmployeeDocumentsController(
            IEmployeeDocumentService service)
        {
            _service = service;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument(
            [FromForm] EmployeeDocumentDto dto)
        {
            var result =
                await _service.UploadDocument(dto);

            return Ok(new
            {
                message = result
            });
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetDocuments(
    string employeeId)
        {
            var data =
                await _service.GetEmployeeDocuments(employeeId);

            return Ok(data);
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadDocument(int id)
        {
            var fileBytes =
                await _service.DownloadDocument(id);

            if (fileBytes.Length == 0)
                return NotFound("File not found");

            return File(
                fileBytes,
                "application/octet-stream",
                $"Document_{id}");
        }

        [HttpGet("view/{id}")]
        public async Task<IActionResult> ViewDocument(int id)
        {
            var path = await _service.GetDocumentPath(id);

            if (string.IsNullOrEmpty(path))
                return NotFound("Document not found");

            return Ok(new
            {
                filePath = path
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var result =
                await _service.DeleteDocument(id);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpPut("verify/{id}")]
        public async Task<IActionResult> VerifyDocument(
    int id,
    [FromBody] DocumentVerificationDto dto)
        {
            var result =
                await _service.VerifyDocument(
                    id,
                    dto.Remarks);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpPut("reject/{id}")]
        public async Task<IActionResult> RejectDocument(
    int id,
    [FromBody] DocumentVerificationDto dto)
        {
            var result =
                await _service.RejectDocument(
                    id,
                    dto.Remarks);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpGet("pending-count")]
        public async Task<IActionResult> GetPendingCount()
        {
            var count =
                await _service.GetPendingDocumentsCount();

            return Ok(new
            {
                pendingCount = count
            });
        }

        [HttpGet("checklist/{employeeId}")]
        public async Task<IActionResult> GetChecklist(
    string employeeId)
        {
            var data =
                await _service.GetChecklist(employeeId);

            return Ok(data);
        }

    }
}