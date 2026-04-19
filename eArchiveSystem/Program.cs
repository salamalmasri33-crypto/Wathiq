using eArchiveSystem.Application.DTOs;
using eArchiveSystem.Application.Interfaces.Persistence;
using eArchiveSystem.Application.Interfaces.Security;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Application.Services;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.Infrastructure.Persistence.Data;
using eArchiveSystem.Infrastructure.Persistence.Repositories;
using eArchiveSystem.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using System.Text;

// =======================================================
// 1) Create Builder
// =======================================================
var builder = WebApplication.CreateBuilder(args);

builder.Host.ConfigureLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
    logging.AddDebug();
});

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var dataProtectionKeysDirectory = new DirectoryInfo(
    Path.Combine(builder.Environment.ContentRootPath, ".data-protection-keys")
);

if (!dataProtectionKeysDirectory.Exists)
{
    dataProtectionKeysDirectory.Create();
}

builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(dataProtectionKeysDirectory)
    .SetApplicationName("Wathiq");

// =======================================================
// 2) Controllers + Swagger
// =======================================================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IMetadataRepository, MetadataRepository>();
builder.Services.AddScoped<IMetadataService, MetadataService>();

builder.Services.AddScoped<IUserService, UserService>();






// =======================================================
// 3) File Upload
// =======================================================
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = long.MaxValue;
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// =======================================================
// 4) MongoDB Config
// =======================================================
builder.Services.Configure<MongoDBSettings>(
    builder.Configuration.GetSection("MongoDB")
);

// Mongo Client
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<MongoDBSettings>>().Value;
    return new MongoClient(settings.ConnectionString);
});

// Mongo Database
builder.Services.AddScoped<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var settings = sp.GetRequiredService<IOptions<MongoDBSettings>>().Value;
    return client.GetDatabase(settings.DatabaseName);
});


// =======================================================
// 5) Dependency Injection
// =======================================================
// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();

// Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IMetadataService, MetadataService>();
builder.Services.AddScoped<IStorageService, LocalStorageService>();
builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IRuleBasedAnalyzer, RuleBasedAnalyzer>();


// OCR

builder.Services.AddHttpClient();



// IMPORTANT: enable QuestPDF free license
QuestPDF.Settings.License = LicenseType.Community;


// Security
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IFileHashCalculator, Sha256FileHashCalculator>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();

// =======================================================
// 6) JWT
// =======================================================
var jwtKey = builder.Configuration["Jwt:Key"];
var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            )
        };
    });

// =======================================================
// 7) Enable CORS
// =======================================================
var allowedCorsOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:4180",
        "http://127.0.0.1:4180",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(allowedCorsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// =======================================================
// 8) Build App
// =======================================================
var app = builder.Build();


// =======================================================
// 9) Create Bootstrap Admin (FIRST RUN ONLY)
// =======================================================
using (var scope = app.Services.CreateScope())
{
    var service = scope.ServiceProvider.GetRequiredService<IUserService>();
    await service.CreateBootstrapAdminIfNotExists(); 
}

// =======================================================
// 10) Middleware
// =======================================================

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}



if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

// 🔗 استخدم CORS قبل الـAuth
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await app.RunAsync();

public partial class Program
{
}
