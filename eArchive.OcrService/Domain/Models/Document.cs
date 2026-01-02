using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace eArchive.OcrService.Domain.Models;

public class Document
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    public string? Content { get; set; }
    public DateTime UpdatedAt { get; set; }
}
