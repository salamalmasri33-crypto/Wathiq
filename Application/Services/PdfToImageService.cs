using eArchiveSystem.Application.Interfaces.Services;
using PdfiumViewer;
using System.Drawing;
using System.Drawing.Imaging;

namespace eArchiveSystem.Application.Services
{
    public class PdfToImageService : IPdfToImageService
    {
        public List<string> ConvertToImages(string pdfPath)
        {
            var images = new List<string>();
            var outputDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(outputDir);

            using var document = PdfDocument.Load(pdfPath);

            for (int i = 0; i < document.PageCount; i++)
            {
                using var image = document.Render(
                    i,
                    300,
                    300,
                    PdfRenderFlags.CorrectFromDpi
                );

                var imagePath = Path.Combine(outputDir, $"page_{i + 1}.png");
                image.Save(imagePath, ImageFormat.Png);
                images.Add(imagePath);
            }

            return images;
        }
    }
}
