using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.DTOs.OCR;
using eArchiveSystem.Application.Interfaces.OCR;
using eArchiveSystem.Application.Interfaces.Services;

namespace eArchiveSystem.Application.Services
{
    public class OcrService : IOcrService
    {
        private readonly IOcrStrategy _strategy;
        private readonly IPdfToImageService _pdfService;

        public OcrService(
            IOcrStrategy strategy,
            IPdfToImageService pdfService)
        {
            _strategy = strategy;
            _pdfService = pdfService;
        }

        public async Task<OcrResultDto> ExtractTextAsync(string filePath, string language)
        {
            if (Path.GetExtension(filePath).ToLower() == ".pdf")
            {
                var images = _pdfService.ConvertToImages(filePath);

                var fullText = "";
                float totalConfidence = 0;

                foreach (var img in images)
                {
                    var result = await _strategy.ProcessAsync(img, language);
                    fullText += result.Text + "\n";
                    totalConfidence += result.Confidence;
                }

                return new OcrResultDto
                {
                    Text = fullText,
                    Confidence = totalConfidence / images.Count
                };
            }

            // Image only
            return await _strategy.ProcessAsync(filePath, language);
        }
    }
}