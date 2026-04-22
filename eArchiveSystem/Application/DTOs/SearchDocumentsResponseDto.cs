namespace eArchiveSystem.Application.DTOs
{
    public class SearchDocumentsResponseDto
    {
        public List<SearchDocumentItemDto> Items { get; set; } = [];
        public long Total { get; set; }
    }
}
