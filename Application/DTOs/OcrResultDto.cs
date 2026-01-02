namespace eArchiveSystem.Application.DTOs
{
    public class OcrResultDto
    {
        public string Text { get; set; } = string.Empty;
        public string Language { get; set; }
        public int Pages { get; set; }
    }
}