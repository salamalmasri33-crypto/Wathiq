using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace eArchiveSystem.Presentation.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    public class OcrCallbackController : ControllerBase
    {
        private readonly IDocumentRepository _documents;
        private readonly IMetadataRepository _metadata;

        public OcrCallbackController(
            IDocumentRepository documents,
            IMetadataRepository metadata)
        {
            _documents = documents;
            _metadata = metadata;
        }
            [AllowAnonymous]
            [HttpPost("callback")]
            public async Task<IActionResult> ReceiveResult(
                [FromQuery] string documentId,
                [FromBody] OcrResultDto result)
            {
                var doc = await _documents.GetByIdAsync(documentId);
                if (doc == null)
                    return NotFound();

                // 1️⃣ Save metadata in Metadata collection
                var metadata = new Metadata
                {
                    Id = documentId,
                    Description = null,
                    Category = result.Category,
                    DocumentType = result.DocumentType,
                    Tags = result.Tags,
                    Department = result.Department,
                    ExpirationDate = result.ExpirationDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _metadata.UpsertAsync(metadata);

                // 2️⃣ Embed metadata into Document
                await _documents.AttachMetadataAsync(documentId);

                // 3️⃣ Update OCR content ONLY (no replace)
                await _documents.UpdateContentAsync(
                    documentId,
                    result.Text,
                    result.Department
                );

                return Ok("OCR processed successfully");
            }
        }

    }
