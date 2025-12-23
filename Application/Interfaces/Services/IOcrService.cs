using eArchiveSystem.Application.DTOs.OCR;

namespace eArchiveSystem.Application.DTOs;
public interface IOcrService
    {
        Task<OcrResultDto> ExtractTextAsync(string filePath, string language);

    }

