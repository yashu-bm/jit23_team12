import api from './api';

/**
 * DocumentService
 *
 * All calls go through the Spring Boot backend at http://localhost:8080/api/
 * so uploads are persisted in MySQL and the full AI report is saved.
 */
class DocumentService {

  /**
   * POST /api/documents/upload
   * Sends the file to Spring Boot, which calls FastAPI for analysis
   * and saves the result in MySQL.
   * Returns the updated LegalDocument (with status=ANALYZED).
   */
  uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  /**
   * GET /api/documents/
   * Returns all LegalDocuments belonging to the authenticated user.
   */
  getDocuments() {
    return api.get('documents/');
  }

  /**
   * GET /api/documents/{documentId}/report
   * Returns the full RiskReport for a given document, including:
   *   - id, overallRiskScore, simpleSummary, createdAt
   *   - document: { id, fileName, ocrText, fileType, uploadDate, status }
   *   - clauses: [{ id, clauseType, riskLevel, riskReason, clauseText }]
   */
  getRiskReport(documentId) {
    return api.get(`documents/${documentId}/report`);
  }
}

export default new DocumentService();
