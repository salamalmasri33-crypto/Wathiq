using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eArchiveSystem.Application.Interfaces.Services;

namespace eArchiveSystem.Presentation.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    public class OcrCallbackController : ControllerBase
    {
        private readonly IDocumentRepository _documents;
        private readonly IMetadataRepository _metadata;
        private readonly IRuleBasedAnalyzer _analyzer;


        public OcrCallbackController(
            IDocumentRepository documents,
            IMetadataRepository metadata,
             IRuleBasedAnalyzer analyzer)
        {
            _documents = documents;
            _metadata = metadata;
            _analyzer = analyzer;
        }
            [AllowAnonymous]
            [HttpPost("callback")]
            public async Task<IActionResult> ReceiveResult(
                [FromQuery] string documentId,
                [FromBody] OcrCallbackDto result)
            {

                var doc = await _documents.GetByIdAsync(documentId);
                if (doc == null)
                    return NotFound();

            var description = _analyzer.ExtractDescription(result.Text);
            var tags = _analyzer.ExtractKeywords(result.Text);
            var category = _analyzer.DetectCategory(result.Text);
            var documentType = _analyzer.DetectDocumentType(result.Text);


            // 1️⃣ Save metadata in Metadata collection
            
                    var metadata = new Metadata
{
    Id = documentId,
    Description = description,
    Category = category,
    DocumentType = documentType,
    Tags = tags,
    Department = doc.Department,
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
                    doc.Department
                );

                return Ok("OCR processed successfully");
            }
        }

    }
