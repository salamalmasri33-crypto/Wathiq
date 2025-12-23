using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Application.Services
{
    public class MetadataService : IMetadataService
    {
        private readonly IDocumentRepository _documents;
        private readonly IMetadataRepository _metadata;
        private readonly IAuditService _audit;

        public MetadataService(IDocumentRepository documents, IMetadataRepository metadata, IAuditService audit)
        {
            _documents = documents;
            _metadata = metadata;
            _audit = audit;
        }

        private bool CanEdit(Document doc, string userId, string role)
        {
            // Admin لا يعدّل أبداً
            if (role == "Admin")
                return false;

            // Manager يعدّل دائماً
            if (role == "Manager")
                return true;

            // User يعدّل فقط لو يملك الوثيقة
            if (role == "User" && doc.UserId == userId)
                return true;

            return false;
        }

        private bool CanView(Document doc, string userId, string role)
        {
            if (role == "Admin" || role == "Manager")
                return true;

            if (role == "User" && doc.UserId == userId)
                return true;

            return false;
        }

        // ---------------------------------------
        // ADD METADATA
        // ---------------------------------------
        public async Task<bool> AddMetadataAsync(string documentId, AddMetadataDto dto, string userId, string role)
        {
            var doc = await _documents.GetByIdAsync(documentId);
            if (doc == null)
                return false;

            if (!CanEdit(doc, userId, role))
                return false;

            var meta = new Metadata
            {
                Id = documentId,
                Description = dto.Description,
                Category = dto.Category,
                Tags = dto.Tags,
                Department = dto.Department,
                DocumentType = dto.DocumentType,
                ExpirationDate = dto.ExpirationDate,
                CreatedAt = DateTime.UtcNow
            };

            await _metadata.AddAsync(meta);
            doc.Metadata = meta;
            doc.UpdatedAt = DateTime.UtcNow;
            await _documents.UpdateAsync(doc.Id, doc);

            // 🔥 سجل عملية الإضافة
            await _audit.LogAsync(
                userId,
                role,
                "AddMetadata",
                documentId,
                $"User {userId} added metadata to document {documentId}"
            );

            return true;
        }

        // ---------------------------------------
        // VIEW METADATA
        // ---------------------------------------
        public async Task<Metadata?> ViewMetadataAsync(string documentId, string userId, string role)
        {
            var doc = await _documents.GetByIdAsync(documentId);
            if (doc == null)
                return null;

            if (!CanView(doc, userId, role))
                return null;

            var meta = await _metadata.GetByDocumentIdAsync(documentId);

            // 🔥 سجل العرض
            await _audit.LogAsync(
                userId,
                role,
                "ViewMetadata",
                documentId,
                $"User {userId} viewed metadata for document {documentId}"
            );

            return meta;
        }

        // ---------------------------------------
        // UPDATE METADATA
        // ---------------------------------------
        public async Task<bool> UpdateMetadataAsync(string documentId, AddMetadataDto dto, string userId, string role)
        {
            var doc = await _documents.GetByIdAsync(documentId);
            if (doc == null)
                return false;

            if (!CanEdit(doc, userId, role))
                return false;

            var existing = await _metadata.GetByDocumentIdAsync(documentId);

            if (existing == null)
            {
                var meta = new Metadata
                {
                    Id = documentId,
                    Description = dto.Description,
                    Category = dto.Category,
                    Tags = dto.Tags,
                    Department = dto.Department,
                    DocumentType = dto.DocumentType,
                    ExpirationDate = dto.ExpirationDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _metadata.AddAsync(meta);

                doc.Metadata = meta;
                doc.UpdatedAt = DateTime.UtcNow;
                doc.Department = dto.Department;
                await _documents.UpdateAsync(doc.Id, doc);

                // Audit
                await _audit.LogAsync(
                    userId,
                    role,
                    "AddMetadata",
                    documentId,
                    $"User {userId} added metadata to document {documentId}"
                );

                return true;
            }

            // تعديل موجود سابقاً
            existing.Description = dto.Description;
            existing.Category = dto.Category;
            existing.Tags = dto.Tags;
            existing.Department = dto.Department;
            existing.DocumentType = dto.DocumentType;
            existing.ExpirationDate = dto.ExpirationDate;
            existing.UpdatedAt = DateTime.UtcNow;

            await _metadata.UpdateAsync(existing.Id, existing);

            doc.Metadata = existing;
            doc.UpdatedAt = DateTime.UtcNow;
            doc.Department = dto.Department;

            await _documents.UpdateAsync(doc.Id, doc);

            // 🔥 سجل التعديل
            await _audit.LogAsync(
                userId,
                role,
                "UpdateMetadata",
                documentId,
                $"User {userId} updated metadata for document {documentId}"
            );

            return true;
        }
    }

}
    


