using System.Net.Http.Headers;
using System.Net.Http.Json;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace eArchiveSystem.IntegrationTests.Documents;

public class SearchDocumentsIntegrationTests : IClassFixture<IntegrationWebApplicationFactory>
{
    private readonly IntegrationWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SearchDocumentsIntegrationTests(IntegrationWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    [Fact]
    public async Task Search_AsRegularUser_ReturnsOnlyOwnedMatchingDocuments()
    {
        await _factory.ResetDatabaseAsync();

        var owner = await _factory.SeedUserAsync("owner@example.com", "Password@123");
        var otherUser = await _factory.SeedUserAsync("other@example.com", "Password@123");

        await _factory.SeedDocumentAsync(
            userId: owner.Id,
            title: "Quarterly Finance Report",
            metadata: new Metadata
            {
                Description = "Detailed finance report for Q1",
                Category = "Finance",
                DocumentType = "Report",
                Tags = new List<string> { "finance", "quarterly" },
                Department = "Finance"
            },
            department: "Finance");

        await _factory.SeedDocumentAsync(
            userId: otherUser.Id,
            title: "Quarterly Finance Report",
            metadata: new Metadata
            {
                Description = "Other user's report",
                Category = "Finance",
                DocumentType = "Report",
                Tags = new List<string> { "finance" },
                Department = "Finance"
            },
            department: "Finance");

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _factory.GenerateJwtToken(owner));

        var searchResponse = await _client.PostAsJsonAsync("/api/documents/search", new
        {
            Query = "Finance"
        });

        searchResponse.EnsureSuccessStatusCode();

        var documents = await searchResponse.Content.ReadFromJsonAsync<List<Document>>();

        Assert.NotNull(documents);
        Assert.Single(documents!);
        Assert.Equal(owner.Id, documents[0].UserId);
        Assert.Equal("Quarterly Finance Report", documents[0].Title);
    }
}
