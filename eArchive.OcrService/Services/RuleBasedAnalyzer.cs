using System.Text.RegularExpressions;

namespace eArchive.OcrService.Services
{
    public class RuleBasedAnalyzer : IRuleBasedAnalyzer
    {
        private static readonly string[] StopWords =
        {
        "the","and","of","in","to","is","for","on","with","as","by"
    };

        public string ExtractDescription(string text)
        {
            var sentences = Regex.Split(text, @"(?<=[\.])")
                .Select(s => s.Trim())
                .Where(s => s.Length > 30)
                .Take(2);

            return string.Join(" ", sentences);
        }

        public List<string> ExtractKeywords(string text)
        {
            return text.ToLower()
                .Split(' ')
                .Where(w => w.Length > 4 && !StopWords.Contains(w))
                .GroupBy(w => w)
                .OrderByDescending(g => g.Count())
                .Take(6)
                .Select(g => g.Key)
                .ToList();
        }

        public string DetectCategory(string text)
        {
            text = text.ToLower();

            if (text.Contains("lecture") || text.Contains("assignment"))
                return "Academic";

            if (text.Contains("policy") || text.Contains("employee"))
                return "HR";

            if (text.Contains("software") || text.Contains("system"))
                return "Technical";

            return "General";
        }
        public string DetectDocumentType(string text, string? fileName = null)
        {
            var content = text.ToLower();

            // 1️⃣ محاضرات
            if (
                content.Contains("lecture") ||
                content.Contains("chapter") ||
                content.Contains("course") ||
                content.Contains("slides")
            )
                return "Lecture";

            // 2️⃣ واجبات / مهام
            if (
                content.Contains("assignment") ||
                content.Contains("task") ||
                content.Contains("required to") ||
                content.Contains("submit")
            )
                return "TaskAssignment";

            // 3️⃣ قرارات / تعاميم
            if (
                content.Contains("decision") ||
                content.Contains("issued by") ||
                content.Contains("effective date") ||
                content.Contains("قرار")
            )
                return "Decision";

            // 4️⃣ تقارير
            if (
                content.Contains("report") ||
                content.Contains("summary") ||
                content.Contains("analysis")
            )
                return "Report";

            // 5️⃣ عقود
            if (
                content.Contains("contract") ||
                content.Contains("agreement") ||
                content.Contains("party") ||
                content.Contains("terms and conditions")
            )
                return "Contract";

            // 6️⃣ فواتير
            if (
                content.Contains("invoice") ||
                content.Contains("amount") ||
                content.Contains("total") ||
                content.Contains("vat")
            )
                return "Invoice";

            // 7️⃣ أدلة تقنية
            if (
                content.Contains("api") ||
                content.Contains("documentation") ||
                content.Contains("guide") ||
                content.Contains("installation")
            )
                return "TechnicalGuide";

            // 8️⃣ fallback
            return "General";
        }

    }
} 