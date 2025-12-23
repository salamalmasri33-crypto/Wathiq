using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Application.Interfaces.Persistence
{
    public interface IDocumentRepository
    {
        Task<Document?> GetByIdAsync(string id);
        Task<Document> GetByHashAsync(string fileHash);
        Task CreateAsync(Document document);
        Task<List<Document>> GetByUserAsync(string userId);
        Task UpdateAsync(string id, Document document);
        Task<List<Document>> SearchAsync(SearchDocumentsDto dto, string userId, string role);

        Task<bool> DeleteAsync(string id);
        Task<List<Document>> GetAllAsync();

    }
}
