using eArchiveSystem.Application.DTOs;

namespace eArchiveSystem.Application.Interfaces.OCR
{
    public interface IOcrStrategy
    {
        Task<OcrResultDto> ProcessAsync(string filePath, string language);
    }
}
