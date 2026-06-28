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
import java.util.List;
import java.util.Map;

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
    private RestTemplate restTemplate;   // Bean defined in AppConfig — includes timeouts

    @Value("${upload.path:uploads/}")
    private String uploadPath;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceBaseUrl;

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

        // 4. Call AI Microservice
        String aiUrl = aiServiceBaseUrl.replaceAll("/$", "") + "/api/v1/analyze/upload";
        log.info("Calling AI microservice at: {}", aiUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(filePath.toFile()));

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(aiUrl, requestEntity, Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> responseBody = response.getBody();

            log.info("AI microservice responded with status: {}", response.getStatusCode());
            log.debug("AI response body: {}", responseBody);

            if (responseBody == null) {
                throw new RuntimeException("AI microservice returned an empty response body.");
            }

            // 5. Extract fields from AI response
            String extractedText  = (String) responseBody.getOrDefault("extracted_text", "");
            String summary        = (String) responseBody.getOrDefault("summary", "No summary available.");
            String overallRisk    = (String) responseBody.getOrDefault("overall_risk", "Unknown");

            log.info("AI analysis complete — overall_risk={}, summary_length={}, extracted_text_length={}",
                    overallRisk, summary.length(), extractedText.length());

            // 6. Persist extracted text back onto the document
            savedDoc.setOcrText(extractedText);
            savedDoc.setStatus("ANALYZED");
            documentRepository.save(savedDoc);

            // 7. Build and persist the RiskReport
            RiskReport report = new RiskReport();
            report.setDocument(savedDoc);
            report.setOverallRiskScore(overallRisk);
            report.setSimpleSummary(summary);
            report.setConfidenceScore(new BigDecimal("0.90"));

            // 8. Map each clause from the AI response
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> clausesData =
                    (List<Map<String, Object>>) responseBody.getOrDefault("clauses", List.of());

            log.info("Processing {} clauses from AI response", clausesData.size());

            for (Map<String, Object> c : clausesData) {
                ClauseAnalysis clause = new ClauseAnalysis();
                clause.setReport(report);
                clause.setClauseType(String.valueOf(c.getOrDefault("clause_type", "General")));
                clause.setRiskLevel(String.valueOf(c.getOrDefault("risk_level", "Medium")));
                clause.setRiskReason(String.valueOf(c.getOrDefault("reason", "")));
                // Clause text is not always available from AI; use a safe fallback
                clause.setClauseText(String.valueOf(c.getOrDefault("clause_text", "See reason for details.")));
                report.getClauses().add(clause);
            }

            riskReportRepository.save(report);
            log.info("RiskReport saved with id={} for document id={}", report.getId(), savedDoc.getId());

        } catch (Exception e) {
            log.error("AI analysis failed for document id={}: {}", savedDoc.getId(), e.getMessage(), e);
            savedDoc.setStatus("FAILED");
            documentRepository.save(savedDoc);
            throw new RuntimeException("AI analysis failed: " + e.getMessage(), e);
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

        documentRepository.delete(doc);
        log.info("Document id={} deleted from database.", id);
    }
}
