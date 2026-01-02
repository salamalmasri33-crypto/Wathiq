using eArchiveSystem.Domain.Models;
namespace eArchiveSystem.Application.Interfaces.Services
{
    public interface IMetadataExtractionService
    {

        Metadata Extract(string documentId, string ocrText, string? department = null);
    }
}

