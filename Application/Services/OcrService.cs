using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.OCR;

namespace eArchiveSystem.Application.Services
{
    public class OcrService : IOcrService
    {
        private readonly IOcrStrategy _strategy;

        public OcrService(IOcrStrategy strategy)
        {
            _strategy = strategy;
        }

        public async Task<OcrResultDto> ExtractTextAsync(string filePath, string language)
        {
            return await _strategy.ProcessAsync(filePath, language);
        }
    }
}
