# Wathiq

Wathiq is a document archiving system that digitizes documents, extracts text using OCR, and allows managing and searching documents through a web interface.

## Project Structure

## Components
- **eArchiveSystem**: Main backend system for managing documents and metadata.
- **eArchive.OcrService**: Independent OCR microservice for text extraction.
- **Frontend**: Web interface built with React.

## Contributors
- Backend & OCR: Salam Almasri and Bushra alshaabani 
- Frontend: Najat Bostaty

## How to Run the Project

### Backend (eArchiveSystem)
Requirements:
- .NET 7 SDK
- MongoDB

Steps:
```bash
cd eArchiveSystem
dotnet restore
dotnet run
```
###note:dotnet restore (downloads all required NuGet packages defined in the project file so the application can build and run correctly.)

### OCR Microservice (eArchive.OcrService)
Requirements:
- .NET 7 SDK
- Tesseract OCR installed on the system

Steps:
```bash
cd eArchive.OcrService
dotnet restore 
dotnet run
```
### Frontend 
The frontend is implemented in a separate branch within the same repository.
Requirements:
- Node.js (v18+)
- npm

Steps:
```bash
git checkout frontend
npm install
npm run dev
```
## Documentation

 **Final Project Report (PDF):**    
[Download Final Report](./Report_Wathiq.pdf)




