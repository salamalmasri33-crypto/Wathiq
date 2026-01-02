using System.Text;
using Tesseract;
using Microsoft.Extensions.Configuration;

namespace eArchive.OcrService.OCR
{
    public class TesseractOcrStrategy : IOcrStrategy
    {
        private readonly string _tessDataPath;

        // 1️⃣ نقرأ المسار من configuration
        public TesseractOcrStrategy(IConfiguration configuration)
        {
            _tessDataPath = configuration["Tesseract:TessDataPath"];

            if (string.IsNullOrWhiteSpace(_tessDataPath))
                throw new Exception("Tesseract tessdata path is not configured.");
        }

        public async Task<string> ProcessAsync(List<string> imagePaths)
        {
            return await Task.Run(() =>
            {
                // 2️⃣ استخدم StringBuilder بدل string
                var sb = new StringBuilder();

                using var engine = new TesseractEngine(
                    _tessDataPath,
                    "ara+eng",
                    EngineMode.Default
                );

                foreach (var imagePath in imagePaths)   // 🔴 imagePath هون فقط
                {
                    // ✅ مسار آمن إنجليزي
                    var safeDir = Path.Combine(
                        Path.GetTempPath(),
                        "eArchive_OCR_SAFE"
                    );
                    Directory.CreateDirectory(safeDir);

                    var safePath = Path.Combine(
                        safeDir,
                        Path.GetFileName(imagePath)
                    );

                    File.Copy(imagePath, safePath, true);

                    using var img = Pix.LoadFromFile(safePath);
                    using var page = engine.Process(img);

                    sb.AppendLine(page.GetText());
                }

                return sb.ToString();
            });

        }
    }
}