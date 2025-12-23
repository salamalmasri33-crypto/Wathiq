using DocumentFormat.OpenXml.Office2010.Word;
using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Application.Interfaces.Security;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Domain.Models;
using Microsoft.AspNetCore.Mvc;
using SharpCompress.Common;

namespace eArchiveSystem.Application.Services
{
    public class DocumentService : IDocumentService
    {
        private readonly IDocumentRepository _documents;
        private readonly IFileHashCalculator _hashCalculator;
        private readonly IStorageService _storage;
        private readonly IUserRepository _users;
        private readonly IMetadataRepository _metadata;
        private readonly IAuditService _audit;
        private readonly IOcrService _ocrService;


        public DocumentService(IDocumentRepository documents,
                               IFileHashCalculator hashCalculator,
                               IStorageService storage,
                               IUserRepository users,
                               IMetadataRepository metadata,
                               IAuditService audit,
                               IOcrService ocrService)
        {
            _documents = documents;
            _hashCalculator = hashCalculator;
            _storage = storage;
            _users = users;
            _metadata = metadata;
            _audit = audit;
            _ocrService = ocrService; 
        }
        // ==================================================
        // 🔐 ROLE PERMISSIONS
        // ==================================================

        private bool CanAdd(string role)
        {
            return role == "User" || role == "Manager";
        }

        private bool CanDelete(Document doc, string userId, string role)
        {
            if (role == "Manager") return true;
            if (role == "User" && doc.UserId == userId) return true;
            return false;
        }

        private bool CanEdit(Document doc, string userId, string role)
        {
            if (role == "Manager") return true;
            if (role == "User" && doc.UserId == userId) return true;
            return false;
        }

        private bool CanView(Document doc, string userId, string role)
        {
            if (role == "Admin") return true;
            if (role == "Manager") return true;
            if (role == "User" && doc.UserId == userId) return true;

            return false;
        }

        private bool CanDownload(Document doc, string userId, string role)
        {
            return CanView(doc, userId, role);
        }

        // ==================================================
        // 📌 ADD DOCUMENT
        // ==================================================

        public async Task<DocumentAddResult> AddDocumentAsync(string userId, AddDocumentDto dto)
        {
            var user = await _users.GetByIdAsync(userId);

            if (!CanAdd(user.Role))
                throw new Exception("Not authorized to add documents");

            if (dto.File == null)
                throw new Exception("File is required");

            var fileHash = await _hashCalculator.ComputeHashAsync(dto.File);
            var existing = await _documents.GetByHashAsync(fileHash);

            if (existing != null)
            {
                return new DocumentAddResult
                {
                    IsDuplicate = true,
                    Document = existing,
                    Message = "File already exists"
                };
            }

            var savedPath = await _storage.SaveFileAsync(dto.File, "uploads");

            var doc = new Document
            {
                Title = string.IsNullOrWhiteSpace(dto.Title) ? dto.File.FileName : dto.Title,
                FileName = dto.File.FileName,
                ContentType = dto.File.ContentType,
                Size = dto.File.Length,
                FileHash = fileHash,
                Content = savedPath,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = userId,
                Department = user.Department
            };

            if (dto.EnableOcr)
            {
                var ocrResult = await _ocrService.ExtractTextAsync(savedPath, "ara+eng");
                doc.Content = ocrResult.Text;
            }


            await _documents.CreateAsync(doc);

            await _audit.LogAsync(userId, user.Role, "AddDocument", doc.Id,
                $"User {userId} added document '{doc.Title}'");

            return new DocumentAddResult
            {
                IsDuplicate = false,
                Document = doc,
                Message = "Document added successfully"
            };
        }

        public async Task<Document?> GetByIdAsync(string id)
        {
            return await _documents.GetByIdAsync(id);
        }


        // ==================================================
        // 📌 VIEW DOCUMENT
        // ==================================================

        public async Task<DocumentViewDto?> ViewDocumentAsync(string id, string userId, string role, string? dept)
        {
            var doc = await _documents.GetByIdAsync(id);
            if (doc == null)
                return null;

            if (!CanView(doc, userId, role))
                return null;

            await _audit.LogAsync(userId, role, "ViewDocument", id,
                $"User {userId} viewed document {id}");

            var owner = await _users.GetByIdAsync(doc.UserId);
            doc.OwnerName = owner?.Name;   // اسم المستخدم
            await _audit.LogAsync(
                userId,
                role,
                "ViewDocument",
                id,
                $"User {userId} viewed document {id}" 
            );
            return new DocumentViewDto
            {
                Id = doc.Id,
                Title = doc.Title,
                Department = doc.Department,
                OwnerName = owner?.Name,
                CreatedAt = doc.CreatedAt,
                Metadata = doc.Metadata,
                OwnerEmail = owner?.Email

            };
        }



        // ==================================================
        // 📌 DOWNLOAD DOCUMENT
        // ==================================================

        public async Task<(Stream FileStream, string FileName, string ContentType)?>
            DownloadDocumentAsync(string id, string userId, string role, string? dept)
        {
            var doc = await _documents.GetByIdAsync(id);
            if (doc == null)
                return null;

            if (!CanDownload(doc, userId, role))
                return null;

            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), doc.Content);

            if (!File.Exists(fullPath))
                return null;

            var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);

            await _audit.LogAsync(userId, role, "DownloadDocument", id,
                $"User {userId} downloaded document {id}");

            return (stream, doc.FileName, doc.ContentType);
        }

        // ==================================================
        // 📌 UPDATE DOCUMENT
        // ==================================================

        public async Task<DocumentUpdateResult> UpdateDocumentAsync(
            string documentId,
            UpdateDocumentDto dto,
            string userId,
            string role)
        {
            var doc = await _documents.GetByIdAsync(documentId);
            if (doc == null)
                return new DocumentUpdateResult { Success = false, Message = "Not found" };

            if (!CanEdit(doc, userId, role))
                return new DocumentUpdateResult { Success = false, Message = "Not authorized" };

            if (!string.IsNullOrWhiteSpace(dto.Title))
                doc.Title = dto.Title;

            if (dto.File != null)
            {
                var newHash = await _hashCalculator.ComputeHashAsync(dto.File);
                var existing = await _documents.GetByHashAsync(newHash);

                if (existing != null && existing.Id != documentId)
                {
                    return new DocumentUpdateResult
                    {
                        Success = false,
                        IsDuplicate = true,
                        ExistingDocumentId = existing.Id,
                        Message = "Duplicate file detected"
                    };
                }

                var oldPath = Path.Combine(Directory.GetCurrentDirectory(), doc.Content);
                if (File.Exists(oldPath)) File.Delete(oldPath);

                var newPath = await _storage.SaveFileAsync(dto.File, "uploads");

                doc.FileName = dto.File.FileName;
                doc.ContentType = dto.File.ContentType;
                doc.Size = dto.File.Length;
                doc.FileHash = newHash;
                doc.Content = newPath;
            }

            doc.UpdatedAt = DateTime.UtcNow;

            await _documents.UpdateAsync(documentId, doc);

            await _audit.LogAsync(userId, role, "UpdateDocument", documentId,
                $"User {userId} updated document {documentId}");

            return new DocumentUpdateResult
            {
                Success = true,
                Document = doc,
                Message = "Updated successfully"
            };
        }

        // ==================================================
        // 📌 DELETE DOCUMENT
        // ==================================================

        public async Task<bool> DeleteDocumentAsync(string id, string userId, string role)
        {
            var doc = await _documents.GetByIdAsync(id);
            if (doc == null)
                return false;

            if (!CanDelete(doc, userId, role))
                return false;

            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), doc.Content);
            if (File.Exists(fullPath))
                File.Delete(fullPath);

            await _metadata.DeleteAsync(id);

            var result = await _documents.DeleteAsync(id);

            await _audit.LogAsync(userId, role, "DeleteDocument", id,
                $"User {userId} deleted document '{doc.Title}'");

            return result;
        }
    }
}