using eArchiveSystem.Application.DTOs.OCR;

namespace eArchiveSystem.Application.Interfaces.OCR
{
    public interface IOcrStrategy
    {
        Task<OcrResultDto> ProcessAsync(string filePath, string language);
    }
}
