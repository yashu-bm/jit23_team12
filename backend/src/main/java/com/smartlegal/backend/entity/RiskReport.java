package com.smartlegal.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "risk_reports")
@Data
@NoArgsConstructor
public class RiskReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The document this report belongs to.
     * @JsonIgnoreProperties prevents Jackson from failing on
     * Hibernate lazy-load proxy objects.
     */
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_id", nullable = false)
    private LegalDocument document;

    @Column(name = "overall_risk_score", length = 50)
    private String overallRiskScore;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;

    /**
     * The AI-generated plain-language summary of the document.
     */
    @Column(name = "simple_summary", columnDefinition = "LONGTEXT")
    private String simpleSummary;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * List of risky clauses extracted by the AI.
     * CascadeType.ALL ensures clauses are persisted/deleted with the report.
     */
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ClauseAnalysis> clauses = new ArrayList<>();
}
