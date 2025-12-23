using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Application.Interfaces.Services
{
    public interface IDocumentService
    {
        // Existing
        Task<DocumentAddResult> AddDocumentAsync(string userId, AddDocumentDto dto);
        Task<Document?> GetByIdAsync(string id);
        Task<bool> DeleteDocumentAsync(string id, string userId, string role);

        // New: View Document with Authorization
        Task<DocumentViewDto?> ViewDocumentAsync(string documentId, string userId, string role, string? department);

        // New: Download Document with Authorization
        Task<(Stream FileStream, string FileName, string ContentType)?> DownloadDocumentAsync(
      string documentId,
           string userId,
          string role,
          string? department
        );

        Task<DocumentUpdateResult> UpdateDocumentAsync(
    string documentId,
    UpdateDocumentDto dto,
    string userId,
    string role
);

    }
}

