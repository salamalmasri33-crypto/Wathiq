using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Application.Interfaces.Persistence
{
    public interface IMetadataRepository
    {
        Task AddAsync(Metadata metadata);
        Task<Metadata?> GetByDocumentIdAsync(string documentId);
        Task UpdateAsync(string id, Metadata metadata);
        Task<bool> DeleteAsync(string documentId);

    }

}
