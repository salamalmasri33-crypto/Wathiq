namespace eArchiveSystem.Application.Interfaces.Services
{
    public interface IPdfToImageService
    {
        List<string> ConvertToImages(string pdfPath);
    }
}
