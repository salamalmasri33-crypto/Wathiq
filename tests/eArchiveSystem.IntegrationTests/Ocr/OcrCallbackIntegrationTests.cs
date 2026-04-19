using System.Net.Http.Json;
using eArchiveSystem.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace eArchiveSystem.IntegrationTests.Ocr;

public class OcrCallbackIntegrationTests : IClassFixture<IntegrationWebApplicationFactory>
{
    private readonly IntegrationWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OcrCallbackIntegrationTests(IntegrationWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task OcrCallback_WhenDocumentExists_StoresMetadataAndUpdatesDocumentContent()
    {
        await _factory.ResetDatabaseAsync();

        var user = await _factory.SeedUserAsync("ocr-owner@example.com", "Password@123");
        var document = await _factory.SeedDocumentAsync(
            userId: user.Id,
            title: "OCR Input",
            department: "Engineering");

        var callbackResponse = await _client.PostAsJsonAsync(
            $"/api/ocr/callback?documentId={document.Id}",
            new
            {
                Text = "This assignment explains a software system analysis report for engineering teams."
            });

        callbackResponse.EnsureSuccessStatusCode();

        var updatedDocument = await _factory.GetDocumentAsync(document.Id);
        var metadata = await _factory.GetMetadataAsync(document.Id);

        Assert.NotNull(updatedDocument);
        Assert.NotNull(metadata);
        Assert.Equal("Engineering", updatedDocument!.Department);
        Assert.Contains("software system analysis report", updatedDocument.Content);
        Assert.Equal("Academic", metadata!.Category);
        Assert.Equal("TaskAssignment", metadata.DocumentType);
        Assert.NotNull(updatedDocument.Metadata);
        Assert.Equal(metadata.DocumentType, updatedDocument.Metadata!.DocumentType);
    }
}
