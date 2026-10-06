package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.LegalDocument;
import com.smartlegal.backend.entity.RiskReport;
import com.smartlegal.backend.service.DocumentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);

    @Autowired
    private DocumentService documentService;

    /**
     * POST /api/documents/upload
     * Accepts a multipart PDF/image file, triggers OCR + AI analysis,
     * saves the result to MySQL, and returns the updated LegalDocument.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            log.info("Upload request received from user: {}, file: {}", email, file.getOriginalFilename());
            LegalDocument doc = documentService.uploadAndAnalyze(file, email);
            log.info("Document analyzed successfully. id={}, status={}", doc.getId(), doc.getStatus());
            return ResponseEntity.ok(buildDocumentMap(doc));
        } catch (Exception e) {
            log.error("Upload failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Upload failed: " + e.getMessage()));
        }
    }

    /**
     * GET /api/documents/
     * Returns all documents for the authenticated user, ordered newest-first.
     */
    @GetMapping("/")
    public ResponseEntity<List<Map<String, Object>>> getUserDocuments() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        List<LegalDocument> docs = documentService.getUserDocuments(email);
        List<Map<String, Object>> response = docs.stream().map(this::buildDocumentMap).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/documents/{id}/report
     * Returns the full RiskReport (summary, overall risk, clauses, extracted text)
     * for the given document ID.
     */
    @GetMapping("/{id}/report")
    public ResponseEntity<?> getRiskReport(@PathVariable Long id) {
        try {
            log.info("Report requested for document id={}", id);
            RiskReport report = documentService.getRiskReport(id);
            log.info("Report found: id={}, clauses={}", report.getId(), report.getClauses().size());
            return ResponseEntity.ok(buildReportMap(report));
        } catch (Exception e) {
            log.error("Report not found for document id={}: {}", id, e.getMessage());
            return ResponseEntity.status(404).body(Map.of("message", "Report not found: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/documents/{id}
     * Deletes a document and its physical file if the authenticated user owns it.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            documentService.deleteDocument(id, email);
            return ResponseEntity.ok(Map.of("message", "Document deleted successfully"));
        } catch (Exception e) {
            log.error("Delete failed for document id={}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to delete document: " + e.getMessage()));
        }
    }

    /**
     * POST /api/documents/{id}/chat
     * Chat with the uploaded document context.
     */
    @PostMapping("/{id}/chat")
    public ResponseEntity<?> chatWithDocument(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            String question = payload.get("question");
            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Question is required"));
            }
            String answer = documentService.chatWithDocument(id, email, question);
            return ResponseEntity.ok(Map.of("answer", answer));
        } catch (Exception e) {
            log.error("Chat failed for document id={}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "AI chat failed: " + e.getMessage()));
        }
    }

    /**
     * GET /api/documents/{id}/download
     * Downloads the AI Risk Report as a PDF.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadReportPdf(@PathVariable Long id) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            byte[] pdfBytes = documentService.generateReportPdf(id, email);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "RiskReport_" + id + ".pdf");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("PDF generation failed for document id={}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(("Failed to generate PDF: " + e.getMessage()).getBytes());
        }
    }

    private Map<String, Object> buildDocumentMap(LegalDocument doc) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", doc.getId());
        map.put("fileName", doc.getFileName());
        map.put("filePath", doc.getFilePath());
        map.put("fileType", doc.getFileType());
        map.put("fileSize", doc.getFileSize());
        map.put("ocrText", doc.getOcrText());
        map.put("uploadDate", doc.getUploadDate());
        map.put("status", doc.getStatus());
        return map;
    }

    private Map<String, Object> buildReportMap(RiskReport report) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", report.getId());
        map.put("overallRiskScore", report.getOverallRiskScore());
        map.put("confidenceScore", report.getConfidenceScore());
        map.put("simpleSummary", report.getSimpleSummary());
        map.put("createdAt", report.getCreatedAt());
        map.put("missingClauses", report.getMissingClauses());
        map.put("recommendations", report.getRecommendations());
        map.put("aiExplanation", report.getAiExplanation());
        
        if (report.getDocument() != null) {
            map.put("document", buildDocumentMap(report.getDocument()));
        }
        
        if (report.getClauses() != null) {
            List<Map<String, Object>> clauses = report.getClauses().stream().map(c -> {
                Map<String, Object> cmap = new HashMap<>();
                cmap.put("id", c.getId());
                cmap.put("clauseType", c.getClauseType());
                cmap.put("clauseText", c.getClauseText());
                cmap.put("riskLevel", c.getRiskLevel());
                cmap.put("riskReason", c.getRiskReason());
                cmap.put("confidenceScore", c.getConfidenceScore());
                return cmap;
            }).collect(Collectors.toList());
            map.put("clauses", clauses);
        }
        
        return map;
    }
}