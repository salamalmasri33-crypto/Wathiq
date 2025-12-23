using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Domain.Models;
using MongoDB.Driver;

namespace eArchiveSystem.Infrastructure.Persistence.Repositories
{
        public class MetadataRepository : IMetadataRepository
        {
            private readonly IMongoCollection<Metadata> _metadata;

            public MetadataRepository(IMongoDatabase database)
            {
                _metadata = database.GetCollection<Metadata>("Metadata");
            }

            public async Task AddAsync(Metadata metadata)
            {
                await _metadata.InsertOneAsync(metadata);
            }

            public async Task<Metadata?> GetByDocumentIdAsync(string documentId)
            {
                return await _metadata.Find(x => x.Id == documentId)
                                      .FirstOrDefaultAsync();
            }

            public async Task UpdateAsync(string id, Metadata metadata)
            {
                
                await _metadata.ReplaceOneAsync(x => x.Id == id, metadata);
            }
        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _metadata.DeleteOneAsync(x => x.Id == id);
            return result.DeletedCount > 0;
        }
       

    }
}



