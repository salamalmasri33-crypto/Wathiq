using System.Text.RegularExpressions;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Domain.Models;
using eArchiveSystem.Application.Interfaces.Services;
using eArchiveSystem.Application.Services;

namespace eArchiveSystem.Application.Services
{
    public class MetadataExtractionService : IMetadataExtractionService
    {
        // Stopwords بسيطة للإنجليزي (قصيرة ومفيدة)
        private static readonly HashSet<string> Stop = new(StringComparer.OrdinalIgnoreCase)
        {
            "the","a","an","and","or","to","of","in","on","for","with","is","are","was","were",
            "be","been","by","as","at","from","this","that","these","those","it","its","into",
            "each","must","should","include","including","section","chapter"
        };

        public Metadata Extract(string documentId, string ocrText, string? department = null)
        {
            var text = Normalize(ocrText);

            var title = ExtractTitle(text);
            var description = BuildDescription(text);
            var tags = ExtractKeywords(text, max: 10);

            // تصنيف بسيط بالقواعد
            var (category, docType) = Classify(text);

            // تاريخ انتهاء: ما منخترعه.. فقط إذا وجدنا تاريخ واضح بالنص
            var expiry = ExtractExpirationDate(text);

            return new Metadata
            {
                Id = documentId,
                Description = description,
                Category = category,
                DocumentType = docType,
                Tags = tags,
                Department = department,
                ExpirationDate = expiry,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        // ---------------------------
        // Helpers
        // ---------------------------

        private static string Normalize(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";

            // وحّد الأسطر والفراغات
            s = s.Replace("\r\n", "\n").Replace("\r", "\n");
            s = Regex.Replace(s, @"[ \t]+", " ");
            s = Regex.Replace(s, @"\n{3,}", "\n\n"); // لا تترك 10 أسطر فاضية
            return s.Trim();
        }

        private static string ExtractTitle(string text)
        {
            // أول سطر غير فارغ بطول معقول
            var lines = text.Split('\n')
                            .Select(l => l.Trim())
                            .Where(l => !string.IsNullOrWhiteSpace(l))
                            .ToList();

            if (lines.Count == 0) return "";

            var first = lines[0];
            if (first.Length is >= 5 and <= 120) return first;

            // إذا طويل كتير: خذ أول 10 كلمات
            var words = first.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return string.Join(" ", words.Take(10));
        }

        private static string BuildDescription(string text)
        {
            // وصف مختصر: أول فقرة + قص
            // الفقرة = حتى أول سطرين فاضيين
            var parts = text.Split("\n\n", StringSplitOptions.RemoveEmptyEntries);
            var firstPara = parts.Length > 0 ? parts[0].Trim() : text;

            // قص إلى 240 حرف (يمكنك تغييره)
            if (firstPara.Length > 240)
                firstPara = firstPara[..240].Trim() + "...";

            // إذا الفقرة هي عنوان فقط، جرّب خذ الفقرة التالية
            if (parts.Length > 1 && firstPara.Length < 30)
            {
                var second = parts[1].Trim();
                if (second.Length > 240) second = second[..240].Trim() + "...";
                firstPara = $"{firstPara} — {second}";
            }

            return firstPara;
        }

        private static List<string> ExtractKeywords(string text, int max = 10)
        {
            // كلمات فقط: letters/numbers
            var tokens = Regex.Matches(text.ToLowerInvariant(), @"[a-z0-9]{3,}")
                              .Select(m => m.Value)
                              .Where(w => !Stop.Contains(w))
                              .ToList();

            if (tokens.Count == 0) return new List<string>();

            var freq = tokens.GroupBy(w => w)
                             .Select(g => new { Word = g.Key, Count = g.Count() })
                             .OrderByDescending(x => x.Count)
                             .ThenBy(x => x.Word)
                             .Take(max)
                             .Select(x => x.Word)
                             .ToList();

            return freq;
        }

        private static (string Category, string DocType) Classify(string text)
        {
            var t = text.ToLowerInvariant();

            // Academic / Instructions
            if (t.Contains("each student") || t.Contains("practical project") || t.Contains("final project report"))
                return ("Academic", "Assignment/Instructions");

            // Finance
            if (t.Contains("invoice") || t.Contains("total") || t.Contains("tax"))
                return ("Financial", "Invoice");

            // Legal
            if (t.Contains("contract") || t.Contains("agreement"))
                return ("Legal", "Contract");

            return ("General", "Document");
        }

        private static DateTime? ExtractExpirationDate(string text)
        {
            // فقط إذا في تاريخ واضح (مثل 2024-12-31 أو 31/12/2024)
            // إن ما لقي -> null
            var iso = Regex.Match(text, @"\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b");
            if (iso.Success && DateTime.TryParse(iso.Value, out var d1)) return d1;

            var dmy = Regex.Match(text, @"\b(0[1-9]|[12]\d|3[01])[\/\-](0[1-9]|1[0-2])[\/\-](20\d{2})\b");
            if (dmy.Success && DateTime.TryParse(dmy.Value, out var d2)) return d2;

            return null;
        }
    }
}
