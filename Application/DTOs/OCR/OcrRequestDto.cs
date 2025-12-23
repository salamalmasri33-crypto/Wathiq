namespace eArchiveSystem.Application.DTOs.OCR
{
    public class OcrRequestDto
    {
        public IFormFile File { get; set; }
        public string Language { get; set; } = "ara+eng";
    }
}
