namespace eArchiveSystem.Domain.Models
{
    public class Metadata
    {
        public string Id { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public List<string>? Tags { get; set; }
        public string? Department { get; set; }
        public string? DocumentType { get; set; }
        public DateTime? ExpirationDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
