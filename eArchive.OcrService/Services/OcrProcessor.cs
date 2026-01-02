using eArchive.OcrService.DTOs;
using eArchive.OcrService.OCR;

namespace eArchive.OcrService.Services
{
    public class OcrProcessor
    {
        
        private readonly IPdfToImageService _pdf;
        private readonly IOcrStrategy _ocrStrategy;
        public OcrProcessor(
            
            IPdfToImageService pdf,
             IOcrStrategy ocrStrategy)
        {
            
            _pdf = pdf;
            _ocrStrategy = ocrStrategy;
        }

        public async Task<OcrResultDto> ProcessAsync(OcrRequestDto dto)
        {
            var images = new List<string>();

            var extension = Path.GetExtension(dto.FilePath).ToLowerInvariant();

            // 1️⃣ تحديد نوع الملف
            if (extension == ".pdf")
            {
                // PDF → Images
                images = await _pdf.ConvertToImages(dto.FilePath);

                if (images.Count == 0)
                    throw new Exception("No images generated from PDF");
            }
            else if (extension == ".jpg" || extension == ".jpeg" || extension == ".png")
            {
                // Image → OCR مباشرة
                images.Add(dto.FilePath);
            }
            else
            {
                throw new Exception("Unsupported file type for OCR");
            }

            // 2️⃣ OCR
            var text = await _ocrStrategy.ProcessAsync(images);

            // 3️⃣ رجّع فقط OCR Text (بدون Metadata ذكية)
            return new OcrResultDto
            {
                Text = text
            };
        }

    }
}
