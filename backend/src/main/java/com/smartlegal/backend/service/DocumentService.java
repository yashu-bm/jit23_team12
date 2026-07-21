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
    @Transactional
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

        // 4. Send to AI Microservice via RestTemplate
        try {
            log.info("Sending document to AI Microservice at http://localhost:8000/api/v1/analyze/upload");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            // Assuming RestTemplate is available as a bean (injected via constructor)
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity("http://localhost:8000/api/v1/analyze/upload", requestEntity, String.class);
            
            log.info("AI Service response status: {}", response.getStatusCode());
            
            JsonNode responseBody = objectMapper.readTree(response.getBody());

            // 7. Extract fields from AI response
            String extractedText  = responseBody.path("extracted_text").asText("");
            String summary        = responseBody.path("summary").asText("No summary available.");
            String overallRisk    = responseBody.path("overall_risk").asText("Unknown");
            String confidence     = responseBody.path("confidence_score").asText("0.90"); // Fallback if Python service doesn't provide it
            
            String missing = "Not provided by microservice.";
            if (responseBody.path("missing_clauses").isArray()) {
                java.util.List<String> missingList = new java.util.ArrayList<>();
                responseBody.path("missing_clauses").forEach(node -> missingList.add("- " + node.asText()));
                missing = String.join("\n", missingList);
            } else if (!responseBody.path("missing_clauses").isMissingNode()) {
                missing = responseBody.path("missing_clauses").asText("");
            }
            
            String recs = "Not provided by microservice.";
            if (responseBody.path("recommendations").isArray()) {
                java.util.List<String> recsList = new java.util.ArrayList<>();
                responseBody.path("recommendations").forEach(node -> recsList.add("- " + node.asText()));
                recs = String.join("\n", recsList);
            } else if (!responseBody.path("recommendations").isMissingNode()) {
                recs = responseBody.path("recommendations").asText("");
            }
            
            String aiExp          = responseBody.path("ai_explanation").asText("Not provided by microservice.");

            log.info("AI analysis complete — overall_risk={}, summary_length={}, extracted_text_length={}",
                    overallRisk, summary.length(), extractedText.length());

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
            log.info("RiskReport saved with id={} for document id={}", report.getId(), savedDoc.getId());

        } catch (HttpClientErrorException e) {
            log.error("AI microservice returned client error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            savedDoc.setStatus("FAILED");
            documentRepository.save(savedDoc);
            throw new RuntimeException("AI Microservice Error: " + e.getResponseBodyAsString(), e);
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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        LegalDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found: " + id));

        if (!doc.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to access document id: " + id);
        }

        try {
            log.info("Sending chat query to AI Microservice for document id={}", id);
            RestTemplate restTemplate = new RestTemplate();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> requestBody = new java.util.HashMap<>();
            requestBody.put("document_text", doc.getOcrText());
            requestBody.put("question", question);

            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(
                    "http://localhost:8000/api/v1/chatbot/document/ask", 
                    requestEntity, 
                    String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            return responseBody.path("response").asText("Sorry, I could not generate an answer.");

        } catch (HttpClientErrorException e) {
            log.error("AI chat microservice returned client error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException("AI Microservice Chat Error: " + e.getResponseBodyAsString());
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
