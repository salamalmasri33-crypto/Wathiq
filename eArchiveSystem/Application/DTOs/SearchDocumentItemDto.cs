namespace eArchiveSystem.Application.DTOs
{
    public class SearchDocumentItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public long Size { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? OwnerId { get; set; }
        public string? Department { get; set; }
        public SearchDocumentMetadataDto? Metadata { get; set; }
    }
}
