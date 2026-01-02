using eArchive.OcrService.DTOs;
using eArchive.OcrService.Services;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Net.Http.Json;

namespace eArchive.OcrService.Controllers
{
    [ApiController]
    [Route("api/ocr")]
    public class OcrController : ControllerBase
    {
        private readonly OcrProcessor _processor;
        private readonly HttpClient _httpClient;

        public OcrController(OcrProcessor processor)
        {
            _processor = processor;

            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback =
                    HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            };

            _httpClient = new HttpClient(handler);
        }

        [HttpPost("process")]
        public async Task<IActionResult> Process([FromBody] OcrRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FilePath))
                return BadRequest("FilePath is missing");

            if (!System.IO.File.Exists(dto.FilePath))
                return BadRequest($"PDF not found: {dto.FilePath}");

            if (string.IsNullOrWhiteSpace(dto.CallbackUrl))
                return BadRequest("CallbackUrl is missing");

            var result = await _processor.ProcessAsync(dto);

            await _httpClient.PostAsJsonAsync(dto.CallbackUrl, result);

            return Ok();
        }

    }


}

