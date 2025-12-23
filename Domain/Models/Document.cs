using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace eArchiveSystem.Domain.Models
{
    public class Document
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        public int DocumentId { get; set; }          // من ال Class Diagram
        public string Title { get; set; }            // title

        public string? Content { get; set; }         //  OCR Text (nullable)
        public string FilePath { get; set; }         //  مسار الملف على السيرفر

        public string FileName { get; set; }         // اسم الملف الأصلي
        public string ContentType { get; set; }      // application/pdf
        public long Size { get; set; }               // الحجم بالبايت

        public string FileHash { get; set; }         // Duplication Handling

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string UserId { get; set; }           // صاحب الوثيقة
        public string Department { get; set; }

        public Metadata? Metadata { get; set; }

        [BsonIgnore]
        public string? OwnerName { get; set; }
    }
}
