using PdfiumViewer;
using System.Drawing.Imaging;

namespace eArchive.OcrService.Services
{
    public class PdfToImageService : IPdfToImageService
    {
        public async Task<List<string>> ConvertToImages(string pdfPath)
        {
            // 🔴 تحقق مهم جدًا
            if (string.IsNullOrWhiteSpace(pdfPath))
                throw new ArgumentException("PDF path is empty");

            if (!File.Exists(pdfPath))
                throw new FileNotFoundException("PDF file not found", pdfPath);
            Console.WriteLine("📄 PDF PATH = " + pdfPath);
            Console.WriteLine("📄 EXISTS = " + File.Exists(pdfPath));

            return await Task.Run(() =>
            {
                var images = new List<string>();

                using var pdf = PdfDocument.Load(pdfPath);

                // مجلد مؤقت خاص لكل OCR job
                var outputDir = Path.Combine(
                    Path.GetTempPath(),
                    "eArchive_OCR",
                    Guid.NewGuid().ToString()
                );

                Directory.CreateDirectory(outputDir);

                for (int i = 0; i < pdf.PageCount; i++)
                {
                    using var img = pdf.Render(
                        i,
                        300,
                        300,
                        PdfRenderFlags.CorrectFromDpi
                    );

                    var imagePath = Path.Combine(outputDir, $"page_{i + 1}.png");

                    img.Save(imagePath, ImageFormat.Png);
                    images.Add(imagePath);
                }

                return images;
            });
        }
    }
}
