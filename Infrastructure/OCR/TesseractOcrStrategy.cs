using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.OCR;

namespace eArchiveSystem.Infrastructure.OCR
{
    public class TesseractOcrStrategy : IOcrStrategy
    {
        public async Task<OcrResultDto> ProcessAsync(string filePath, string language)
        {
            // Placeholder – external OCR service call
            return new OcrResultDto
            {
                Text = "",
                Confidence = 0
            };
        }
    }

}
