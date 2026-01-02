using eArchive.OcrService.DTOs;
namespace eArchive.OcrService.OCR
{
    public interface IOcrStrategy
    {
        Task<string> ProcessAsync(List<string> imagePaths);
     
    }
    public class OcrPageResult
    {
        public string Text { get; set; }
        public float Confidence { get; set; }
    }
}
