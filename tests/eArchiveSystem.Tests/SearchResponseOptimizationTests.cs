using System.Text;
using System.Text.Json;
using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Tests;

public class SearchResponseOptimizationTests
{
    [Fact]
    public void SearchPayloadProjection_ShouldBeSignificantlySmaller_WhenDocumentContainsLargeOcrContent()
    {
        var fullDocument = new Document
        {
            Id = "507f1f77bcf86cd799439011",
            Title = "Quarterly Finance Report",
            Content = new string('A', 12_000),
            FilePath = "uploads/quarterly-finance-report.pdf",
            FileName = "quarterly-finance-report.pdf",
            ContentType = "application/pdf",
            Size = 2048,
            FileHash = new string('B', 64),
            CreatedAt = new DateTime(2026, 4, 19, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 4, 19, 10, 5, 0, DateTimeKind.Utc),
            UserId = "owner-123",
            Department = "Finance",
            Metadata = new Metadata
            {
                Description = "Detailed finance report for Q1",
                Category = "Finance",
                DocumentType = "Report",
                Tags = new List<string> { "finance", "quarterly" },
                Department = "Finance"
            }
        };

        var projectedSearchResult = new SearchDocumentItemDto
        {
            Id = fullDocument.Id,
            Title = fullDocument.Title,
            FileName = fullDocument.FileName,
            ContentType = fullDocument.ContentType,
            Size = fullDocument.Size,
            CreatedAt = fullDocument.CreatedAt,
            UpdatedAt = fullDocument.UpdatedAt,
            OwnerId = fullDocument.UserId,
            Department = fullDocument.Department,
            Metadata = new SearchDocumentMetadataDto
            {
                Description = fullDocument.Metadata?.Description,
                Category = fullDocument.Metadata?.Category,
                Tags = fullDocument.Metadata?.Tags,
                Department = fullDocument.Metadata?.Department,
                DocumentType = fullDocument.Metadata?.DocumentType,
                ExpirationDate = fullDocument.Metadata?.ExpirationDate
            }
        };

        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var fullDocumentBytes = Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(fullDocument, jsonOptions));
        var projectedBytes = Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(projectedSearchResult, jsonOptions));

        Assert.True(projectedBytes < fullDocumentBytes, $"Expected projected payload to be smaller, but got {projectedBytes} vs {fullDocumentBytes} bytes.");
        Assert.True(projectedBytes <= fullDocumentBytes / 4, $"Expected projected payload to be at most 25% of the original size, but got {projectedBytes} vs {fullDocumentBytes} bytes.");
    }
}
