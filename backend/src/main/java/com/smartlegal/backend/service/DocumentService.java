package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.ClauseAnalysis;
import com.smartlegal.backend.entity.LegalDocument;
import com.smartlegal.backend.entity.RiskReport;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.DocumentRepository;
import com.smartlegal.backend.repository.RiskReportRepository;
import com.smartlegal.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import java.io.ByteArrayOutputStream;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private RiskReportRepository riskReportRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GeminiService geminiService;
    
    @Autowired
    private ObjectMapper objectMapper;

    @Value("${upload.path:uploads/}")
    private String uploadPath;

    /**
     * Uploads a document, sends it to the AI microservice for analysis,
     * saves the full report (summary, extracted text, risk score, clauses)
     * into MySQL, and returns the updated document.
     */
    public LegalDocument uploadAndAnalyze(MultipartFile file, String email) throws IOException {
        log.info("Starting document upload and analysis for user: {}", email);

        // 1. Resolve user
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        // 2. Save file to disk
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadPath, fileName);
        Files.write(filePath, file.getBytes());
        log.info("File saved to disk: {}", filePath);

        // 3. Save initial LegalDocument record with PROCESSING status
        LegalDocument doc = new LegalDocument();
        doc.setUser(user);
        doc.setFileName(file.getOriginalFilename());
        doc.setFilePath(filePath.toString());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setStatus("PROCESSING");
        LegalDocument savedDoc = documentRepository.save(doc);
        log.info("Document saved with id={}, status=PROCESSING", savedDoc.getId());

        long overallStart = System.currentTimeMillis();
        long extractionStart = System.currentTimeMillis();
        // 4. Extract Text / Prepare Base64 for Gemini
        String extractedTextFromDocx = null;
        String base64Data = null;
        String mimeType = file.getContentType();
        
        try {
            if (mimeType != null && mimeType.contains("wordprocessingml")) {
                try (java.io.InputStream is = file.getInputStream(); 
                     XWPFDocument document = new XWPFDocument(is); 
                     XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
                    extractedTextFromDocx = extractor.getText();
                }
            } else {
                base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            }
        } catch (Exception e) {
            savedDoc.setStatus("FAILED");
            documentRepository.save(savedDoc);
            throw new RuntimeException("Failed to read file content: " + e.getMessage(), e);
        }
        long extractionEnd = System.currentTimeMillis();

        // 5. Build prompt and send to Gemini
        try {
            log.info("Sending document to Gemini API for analysis");
            
            String prompt = "You are an expert legal assistant. Analyze this legal document and extract key information. "
                    + "You MUST return the output EXACTLY in the following JSON structure, with no markdown formatting or extra text outside the JSON: "
                    + "{ \"extracted_text\": \"<The full extracted OCR text of the document>\", "
                    + "\"summary\": \"<A concise summary>\", "
                    + "\"overall_risk\": \"<High/Medium/Low>\", "
                    + "\"confidence_score\": 0.95, "
                    + "\"missing_clauses\": [\"<clause 1>\", \"<clause 2>\"], "
                    + "\"recommendations\": [\"<rec 1>\", \"<rec 2>\"], "
                    + "\"ai_explanation\": \"<Explanation of your analysis>\", "
                    + "\"clauses\": [ { \"clause_type\": \"<Type>\", \"risk_level\": \"<High/Medium/Low>\", \"reason\": \"<Reason>\", \"clause_text\": \"<Text>\" } ] }\n\n"
                    + "CRITICAL RULE: Ensure all string values are properly escaped for JSON. Do not include unescaped newlines, backslashes, quotes, or control characters inside string values. If the OCR text contains backslashes or newlines, they must be escaped properly as \\\\n or \\\\\\\\.";
                    
            if (extractedTextFromDocx != null) {
                prompt += "\n\nDocument Text:\n" + extractedTextFromDocx;
            }

            long geminiStart = System.currentTimeMillis();
            String aiResponse = geminiService.generateContent(prompt, base64Data, mimeType, true);
            long geminiEnd = System.currentTimeMillis();
            
            long parsingStart = System.currentTimeMillis();
            // Strip markdown JSON if present
            aiResponse = aiResponse.trim();
            if (aiResponse.startsWith("```json")) {
                aiResponse = aiResponse.substring(7);
            }
            if (aiResponse.endsWith("```")) {
                aiResponse = aiResponse.substring(0, aiResponse.length() - 3);
            }
            aiResponse = aiResponse.trim();
            
            // Sanitize unescaped backslashes that cause Unrecognized character escape (code 32)
            // Replaces any backslash not followed by a valid JSON escape char with double backslash
            aiResponse = aiResponse.replaceAll("\\\\(?![\"\\\\/bfnrtu])", "\\\\\\\\");
            
            JsonNode responseBody = objectMapper.readTree(aiResponse);

            // 7. Extract fields from AI response
            String extractedText  = responseBody.path("extracted_text").asText("");
            String summary        = responseBody.path("summary").asText("No summary available.");
            String overallRisk    = responseBody.path("overall_risk").asText("Unknown");
            String confidence     = responseBody.path("confidence_score").asText("0.90");
            
            String missing = "Not provided.";
            if (responseBody.path("missing_clauses").isArray()) {
                java.util.List<String> missingList = new java.util.ArrayList<>();
                responseBody.path("missing_clauses").forEach(node -> missingList.add("- " + node.asText()));
                missing = String.join("\n", missingList);
            } else if (!responseBody.path("missing_clauses").isMissingNode()) {
                missing = responseBody.path("missing_clauses").asText("");
            }
            
            String recs = "Not provided.";
            if (responseBody.path("recommendations").isArray()) {
                java.util.List<String> recsList = new java.util.ArrayList<>();
                responseBody.path("recommendations").forEach(node -> recsList.add("- " + node.asText()));
                recs = String.join("\n", recsList);
            } else if (!responseBody.path("recommendations").isMissingNode()) {
                recs = responseBody.path("recommendations").asText("");
            }
            
            String aiExp          = responseBody.path("ai_explanation").asText("Not provided.");
            long parsingEnd = System.currentTimeMillis();

            log.info("AI analysis complete — overall_risk={}, summary_length={}, extracted_text_length={}",
                    overallRisk, summary.length(), extractedText.length());

            long dbStart = System.currentTimeMillis();
            // 8. Persist extracted text back onto the document
            savedDoc.setOcrText(extractedText);
            savedDoc.setStatus("ANALYZED");
            documentRepository.save(savedDoc);

            // 9. Build and persist the RiskReport
            RiskReport report = new RiskReport();
            report.setDocument(savedDoc);
            report.setOverallRiskScore(overallRisk);
            report.setSimpleSummary(summary);
            try {
                report.setConfidenceScore(new BigDecimal(confidence));
            } catch (Exception e) {
                report.setConfidenceScore(new BigDecimal("0.90"));
            }
            report.setMissingClauses(missing);
            report.setRecommendations(recs);
            report.setAiExplanation(aiExp);

            // 10. Map each clause from the AI response
            JsonNode clausesNode = responseBody.path("clauses");
            if (clausesNode.isArray()) {
                log.info("Processing {} clauses from AI response", clausesNode.size());
                for (JsonNode c : clausesNode) {
                    ClauseAnalysis clause = new ClauseAnalysis();
                    clause.setReport(report);
                    clause.setClauseType(c.path("clause_type").asText("General"));
                    clause.setRiskLevel(c.path("risk_level").asText("Medium"));
                    clause.setRiskReason(c.path("reason").asText(""));
                    clause.setClauseText(c.path("clause_text").asText("See reason for details."));
                    report.getClauses().add(clause);
                }
            }

            riskReportRepository.save(report);
            long dbEnd = System.currentTimeMillis();
            long overallEnd = System.currentTimeMillis();
            
            log.info("PERFORMANCE REPORT | Extraction: {} ms | Gemini: {} ms | JSON Parsing: {} ms | DB Save: {} ms | Total: {} ms",
                (extractionEnd - extractionStart), (geminiEnd - geminiStart), (parsingEnd - parsingStart), (dbEnd - dbStart), (overallEnd - overallStart));
            log.info("RiskReport saved with id={} for document id={}", report.getId(), savedDoc.getId());

        } catch (Exception e) {
            log.error("AI analysis failed for document id={}: {}", savedDoc.getId(), e.getMessage(), e);
            savedDoc.setStatus("FAILED");
            documentRepository.save(savedDoc);
            throw new RuntimeException("Analysis failed. Please try again. Reason: " + e.getMessage(), e);
        }

        return savedDoc;
    }

    /**
     * Returns all documents for a given user, ordered newest-first.
     */
    public List<LegalDocument> getUserDocuments(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return documentRepository.findByUserIdOrderByUploadDateDesc(user.getId());
    }

    /**
     * Fetches the full RiskReport (with clauses) for a given document ID.
     */
    public RiskReport getRiskReport(Long documentId) {
        log.info("Fetching risk report for document id={}", documentId);
        return riskReportRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new RuntimeException("Report not found for document id: " + documentId));
    }

    /**
     * Deletes a document (and its associated file on disk) if the requesting user owns it.
     */
    @Transactional
    public void deleteDocument(Long id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        LegalDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        if (!doc.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete document id: " + id);
        }

        // Delete physical file
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
            log.info("Deleted file from disk: {}", doc.getFilePath());
        } catch (Exception e) {
            log.warn("Could not delete file from disk: {}", doc.getFilePath(), e);
        }

        // Delete associated Risk Report if exists
        try {
            riskReportRepository.findByDocumentId(id).ifPresent(report -> {
                riskReportRepository.delete(report);
                log.info("Deleted associated RiskReport id={}", report.getId());
            });
        } catch (Exception e) {
            log.warn("Error checking/deleting RiskReport for document id={}: {}", id, e.getMessage());
        }

        documentRepository.delete(doc);
        log.info("Document id={} deleted from database.", id);
    }

    /**
     * Chat with a document using AI.
     */
    public String chatWithDocument(Long id, String email, String question) {
        long startTotal = System.currentTimeMillis();
        
        long startDb = System.currentTimeMillis();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        LegalDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        if (!doc.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to access document id: " + id);
        }
        
        // Fetch pre-computed risk report to reduce context size
        RiskReport report = riskReportRepository.findByDocumentId(id).orElse(null);
        long endDb = System.currentTimeMillis();

        try {
            long startContext = System.currentTimeMillis();
            log.info("Sending chat query to Gemini API for document id={}", id);
            
            StringBuilder contextBuilder = new StringBuilder();
            
            if (report != null) {
                contextBuilder.append("--- PRE-ANALYZED DOCUMENT REPORT ---\n");
                contextBuilder.append("Summary: ").append(report.getSimpleSummary()).append("\n");
                contextBuilder.append("Overall Risk: ").append(report.getOverallRiskScore()).append("\n");
                if (report.getClauses() != null && !report.getClauses().isEmpty()) {
                    contextBuilder.append("Key Clauses:\n");
                    for (ClauseAnalysis clause : report.getClauses()) {
                        contextBuilder.append("- Type: ").append(clause.getClauseType())
                                      .append(" | Risk: ").append(clause.getRiskLevel())
                                      .append(" | Reason: ").append(clause.getRiskReason())
                                      .append("\n");
                    }
                }
                contextBuilder.append("------------------------------------\n\n");
            }
            
            // Provide a limited snippet of the original text as fallback context
            String ocrText = doc.getOcrText();
            if (ocrText != null) {
                int limit = report != null ? 15000 : 40000; // Smaller if we have a report
                if (ocrText.length() > limit) {
                    ocrText = ocrText.substring(0, limit) + "... [TRUNCATED FOR SPEED]";
                }
                contextBuilder.append("--- DOCUMENT TEXT EXCERPT ---\n")
                              .append(ocrText)
                              .append("\n-----------------------------\n\n");
            }
            
            String prompt = "You are an expert legal assistant helping a user understand a document.\n\n"
                    + contextBuilder.toString()
                    + "User Question: " + question + "\n\n"
                    + "Provide a helpful, accurate, and concise answer based ONLY on the provided document context. If the user asks about clauses, reference the 'Key Clauses' section if available.";
            long endContext = System.currentTimeMillis();

            long startGemini = System.currentTimeMillis();
            String aiResponse = geminiService.generateContent(prompt, null, null, false);
            long endGemini = System.currentTimeMillis();
            
            long endTotal = System.currentTimeMillis();
            
            log.info("--- CHAT PERFORMANCE REPORT ---");
            log.info("Document lookup: {} ms", (endDb - startDb));
            log.info("Context preparation: {} ms", (endContext - startContext));
            log.info("Prompt construction: {} ms", (endContext - startContext));
            log.info("Gemini request: {} ms", (endGemini - startGemini));
            log.info("Response parsing: 0 ms (done in GeminiService)");
            log.info("TOTAL: {} ms", (endTotal - startTotal));
            log.info("Gemini request count = 1");
            log.info("-------------------------------");

            return aiResponse;

        } catch (Exception e) {
            log.error("AI chat failed for document id={}", id, e);
            throw new RuntimeException("Chat failed: " + e.getMessage());
        }
    }

    /**
     * Generate PDF report.
     */
    public byte[] generateReportPdf(Long id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        RiskReport report = riskReportRepository.findByDocumentId(id)
                .orElseThrow(() -> new RuntimeException("Report not found for document id: " + id));

        if (!report.getDocument().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to access document id: " + id);
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            document.add(new Paragraph("AI Legal Document Risk Report")
                    .setFontSize(20).setBold());
            
            document.add(new Paragraph("File Name: " + report.getDocument().getFileName()));
            document.add(new Paragraph("Date Analyzed: " + report.getCreatedAt()));
            document.add(new Paragraph("Overall Risk Score: " + report.getOverallRiskScore()));
            document.add(new Paragraph("Confidence Score: " + report.getConfidenceScore()));
            
            document.add(new Paragraph("\nSummary").setFontSize(16).setBold());
            document.add(new Paragraph(report.getSimpleSummary() != null ? report.getSimpleSummary() : "N/A"));

            document.add(new Paragraph("\nAI Explanation").setFontSize(16).setBold());
            document.add(new Paragraph(report.getAiExplanation() != null ? report.getAiExplanation() : "N/A"));

            document.add(new Paragraph("\nMissing Clauses").setFontSize(16).setBold());
            document.add(new Paragraph(report.getMissingClauses() != null ? report.getMissingClauses() : "None"));

            document.add(new Paragraph("\nRecommendations").setFontSize(16).setBold());
            document.add(new Paragraph(report.getRecommendations() != null ? report.getRecommendations() : "None"));

            document.add(new Paragraph("\nClause Analysis").setFontSize(16).setBold());
            
            if (report.getClauses() != null && !report.getClauses().isEmpty()) {
                Table table = new Table(new float[]{2, 2, 4});
                table.addHeaderCell(new Cell().add(new Paragraph("Clause Type").setBold()));
                table.addHeaderCell(new Cell().add(new Paragraph("Risk Level").setBold()));
                table.addHeaderCell(new Cell().add(new Paragraph("Reason / Details").setBold()));
                
                for (ClauseAnalysis c : report.getClauses()) {
                    table.addCell(new Cell().add(new Paragraph(c.getClauseType() != null ? c.getClauseType() : "")));
                    table.addCell(new Cell().add(new Paragraph(c.getRiskLevel() != null ? c.getRiskLevel() : "")));
                    table.addCell(new Cell().add(new Paragraph(c.getRiskReason() != null ? c.getRiskReason() : c.getClauseText())));
                }
                document.add(table);
            } else {
                document.add(new Paragraph("No clauses flagged."));
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF", e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage());
        }
    }
}
