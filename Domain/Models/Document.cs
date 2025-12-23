using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace eArchiveSystem.Domain.Models
{
    public class Document
    {
        // نستخدم Id لـ MongoDB، و DocumentId منطقي داخلي للنظام (لو حبيت)
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        public int DocumentId { get; set; }          // من ال Class Diagram
        public string Title { get; set; }            // title
        public string Content { get; set; }          // ممكن نخزن النص المستخرج لاحقاً (OCR)
        public string FileName { get; set; }         // اسم الملف الأصلي
        public string ContentType { get; set; }      // مثلاً application/pdf
        public long Size { get; set; }               // الحجم بالبايت

        public string FileHash { get; set; }         // لهدف Duplication Handling

        public DateTime CreatedAt { get; set; }      // createdAt
        public DateTime UpdatedAt { get; set; }      // updatedAt

        public string UserId { get; set; }           // userId = صاحب الوثيقة

        public Metadata? Metadata { get; set; }
        public string Department { get; set; }
       
        [BsonIgnore]
        public string? OwnerName { get; set; }



    }

}
