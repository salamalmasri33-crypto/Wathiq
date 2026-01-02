using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Application.Services;


namespace eArchiveSystem.Presentation.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    public class OcrCallbackController : ControllerBase
    {
        private readonly IDocumentRepository _documents;
        private readonly IMetadataRepository _metadata;
        private readonly IMetadataExtractionService _extractor;

        public OcrCallbackController(
            IDocumentRepository documents,
            IMetadataRepository metadata,
              IMetadataExtractionService extractor)
        {
            _documents = documents;
            _metadata = metadata;
            _extractor = extractor;
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

            // 1️⃣ خزّن OCR text فقط
            await _documents.UpdateContentAsync(
                documentId,
                result.Text,
                doc.Department
            );

            // 2️⃣ استخرج Metadata من النص
            var extractedMeta = _extractor.Extract(
                documentId,
                result.Text,
                doc.Department
            );

            // 3️⃣ خزّن Metadata
            await _metadata.UpsertAsync(extractedMeta);

            // 4️⃣ اربط Metadata بالوثيقة
            await _documents.AttachMetadataAsync(documentId);

            return Ok("OCR processed successfully");
        }
    }
}
