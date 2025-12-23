using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Domain.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace eArchiveSystem.Infrastructure.Persistence.Repositories
{
    public class DocumentRepository : IDocumentRepository
    {
        private readonly IMongoCollection<Document> _documents;

        public DocumentRepository(IMongoDatabase database)
        {
            _documents = database.GetCollection<Document>("Documents");
        }

        public async Task<Document> GetByHashAsync(string fileHash) =>
            await _documents.Find(d => d.FileHash == fileHash).FirstOrDefaultAsync();

        public async Task CreateAsync(Document document) =>
            await _documents.InsertOneAsync(document);

        public async Task<List<Document>> GetByUserAsync(string userId) =>
            await _documents.Find(d => d.UserId == userId).ToListAsync();
        public async Task UpdateAsync(string id, Document document)
        {
            var filter = Builders<Document>.Filter.Eq(d => d.Id, id);
            await _documents.ReplaceOneAsync(filter, document);
        }
        public async Task<Document?> GetByIdAsync(string id)
        {
            var filter = Builders<Document>.Filter.Eq(d => d.Id, id);
            return await _documents.Find(filter).FirstOrDefaultAsync();
        }
        public async Task<List<Document>> SearchAsync(
     SearchDocumentsDto dto,
     string userId,
     string role)
        {
            var filters = new List<FilterDefinition<Document>>();

            // ==========================================
            // 1) Access Filter (صلاحيات الوصول)
            // ==========================================

            if (role == "User")
            {
                // 👤 User يرى فقط وثائقه
                filters.Add(Builders<Document>.Filter.Eq(d => d.UserId, userId));
            }

            // Manager + Admin يشوفوا كل الوثائق… لا نضيف أي فلتر هنا


            // ==========================================
            // 2) Text Search (يعمل فقط إذا Query ليست فارغة)
            // ==========================================

            if (!string.IsNullOrEmpty(dto.Query))
            {
                // نعمل Regex Search على الحقول النصية
                var text = new BsonRegularExpression(dto.Query, "i");

                filters.Add(
                    Builders<Document>.Filter.Or(
                        Builders<Document>.Filter.Regex(d => d.Title, text),
                        Builders<Document>.Filter.Regex("Metadata.Description", text),
                        Builders<Document>.Filter.Regex("Metadata.Tags", text),
                        Builders<Document>.Filter.Regex("Metadata.Category", text),
                         Builders<Document>.Filter.Regex("Metadata.DocumentType", text)
                    )
                );
            }

            // ==========================================
            // 3) Filter by Category (اختياري)
            // ==========================================

            if (!string.IsNullOrEmpty(dto.Category))
            {
                filters.Add(Builders<Document>.Filter.Eq(d => d.Metadata.Category, dto.Category));
            }

            // ==========================================
            // 4) Filter by Department (اختياري)
            // ==========================================

            if (!string.IsNullOrEmpty(dto.Department))
            {
                filters.Add(Builders<Document>.Filter.Eq(d => d.Department, dto.Department));
            }

            // ==========================================
            // 5) Filter by Date Range (من / إلى)
            // ==========================================

            if (dto.FromDate != null)
            {
                filters.Add(Builders<Document>.Filter.Gte(d => d.CreatedAt, dto.FromDate));
            }

            if (dto.ToDate != null)
            {
                filters.Add(Builders<Document>.Filter.Lte(d => d.CreatedAt, dto.ToDate));
            }

            // ==========================================
            // 6) Build Final Filter (AND)
            // ==========================================

            var filter = filters.Count > 0
                ? Builders<Document>.Filter.And(filters)
                : Builders<Document>.Filter.Empty;


            // ==========================================
            // 7) Sorting (الترتيب)
            // ==========================================

            SortDefinition<Document> sort;

            if (dto.SortBy == "Title")
            {
                sort = dto.Desc
                    ? Builders<Document>.Sort.Descending(d => d.Title)
                    : Builders<Document>.Sort.Ascending(d => d.Title);
            }
            else if (dto.SortBy == "CreatedAt")
            {
                sort = dto.Desc
                    ? Builders<Document>.Sort.Descending(d => d.CreatedAt)
                    : Builders<Document>.Sort.Ascending(d => d.CreatedAt);
            }
            else
            {
                // الوضع الافتراضي — الأحدث أولًا
                sort = Builders<Document>.Sort.Descending(d => d.CreatedAt);
            }


            // ==========================================
            // 8) Execute Query
            // ==========================================

            return await _documents
                .Find(filter)
                .Sort(sort)
                .ToListAsync();
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _documents.DeleteOneAsync(d => d.Id == id);
            return result.DeletedCount > 0;
        }
        public async Task<List<Document>> GetAllAsync()
        {
            return await _documents.Find(_ => true).ToListAsync();
        }


    }
}
