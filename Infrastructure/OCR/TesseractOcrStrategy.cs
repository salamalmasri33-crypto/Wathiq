using eArchiveSystem.Application.DTOs.OCR;
using eArchiveSystem.Application.Interfaces.OCR;
using Tesseract;

namespace eArchiveSystem.Infrastructure.OCR
{
    public class TesseractOcrStrategy : IOcrStrategy
    {
        public Task<OcrResultDto> ProcessAsync(string filePath, string language)
        {
            // language مثال: "eng" أو "ara" أو "ara+eng"
            var tessDataPath = @"C:\Program Files\Tesseract-OCR\tessdata";

            using var engine = new TesseractEngine(
                tessDataPath,
                language,
                EngineMode.Default
            );

            using var img = Pix.LoadFromFile(filePath);
            using var page = engine.Process(img);

            var text = page.GetText();
            var confidence = page.GetMeanConfidence();

            return Task.FromResult(new OcrResultDto
            {
                Text = text,
                Confidence = confidence
            });
        }
    }

}