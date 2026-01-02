using eArchive.OcrService.Services;
using MongoDB.Driver;
using eArchive.OcrService.OCR;
using Microsoft.Extensions.DependencyInjection;

AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("🔥 FATAL ERROR:");
    Console.WriteLine(e.ExceptionObject);
    Console.ResetColor();
};


var builder = WebApplication.CreateBuilder(args);

// =======================================================
// 1) Controllers + Swagger
// =======================================================

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// =======================================================
// 2) HTTP Client (للتماسك مع Microservices أخرى لاحقًا)
// =======================================================

builder.Services
    .AddHttpClient("unsafe")
    .ConfigurePrimaryHttpMessageHandler(() =>
        new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback =
                HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        });



// =======================================================
// 3) OCR Core Services
// =======================================================

// Strategy (Tesseract)
builder.Services.AddScoped<IOcrStrategy, TesseractOcrStrategy>();

// PDF → Image
builder.Services.AddScoped<IPdfToImageService, PdfToImageService>();

// Orchestrator (Business Logic)
builder.Services.AddScoped<OcrProcessor>();

// =======================================================
// 4) MongoDB
// =======================================================

builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var conn = builder.Configuration["Mongo:ConnectionString"];
    return new MongoClient(conn);
});

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase("eArchive");
});

// =======================================================
// 5) Build App
// =======================================================

var app = builder.Build();

// =======================================================
// 6) Middleware
// =======================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
Console.WriteLine("✅ OCR SERVICE STARTED AND LISTENING...");

app.Run();
