using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.DTOs.OCR;
using eArchiveSystem.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;


namespace eArchiveSystem.Presentation.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    public class OcrController : ControllerBase
    {
        private readonly IOcrService _ocrService;
        private readonly IStorageService _storageService;

        public OcrController(
            IOcrService ocrService,
            IStorageService storageService)
        {
            _ocrService = ocrService;
            _storageService = storageService;
        }

        [HttpPost("extract")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ExtractText([FromForm] OcrRequestDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
                return BadRequest("No file uploaded");

            // حفظ مؤقت
            var filePath = await _storageService.SaveFileAsync(dto.File, "ocr-temp");

            var result = await _ocrService.ExtractTextAsync(
                filePath,
                dto.Language
            );

            return Ok(result);
        }
    }
}
