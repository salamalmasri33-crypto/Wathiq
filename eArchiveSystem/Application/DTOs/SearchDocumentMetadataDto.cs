namespace eArchiveSystem.Application.DTOs
{
    public class SearchDocumentMetadataDto
    {
        public string? Description { get; set; }
        public string? Category { get; set; }
        public List<string>? Tags { get; set; }
        public string? Department { get; set; }
        public string? DocumentType { get; set; }
        public DateTime? ExpirationDate { get; set; }
    }
}
