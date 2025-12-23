using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Domain.Models;

namespace eArchiveSystem.Application.Interfaces.Services
{


    public interface IMetadataService
    {
        Task<bool> AddMetadataAsync(
            string documentId,
            AddMetadataDto dto,
            string userId,
            string role
            
        );

        Task<Metadata?> ViewMetadataAsync(
            string documentId,
            string userId,
            string role
            
        );

        Task<bool> UpdateMetadataAsync(
            string documentId,
            AddMetadataDto dto,
            string userId,
            string role
            
        );
    }
}