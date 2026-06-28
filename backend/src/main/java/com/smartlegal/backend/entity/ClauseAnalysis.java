package com.smartlegal.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "clause_analysis")
@Data
@NoArgsConstructor
public class ClauseAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Back-reference to RiskReport — excluded from JSON serialization
     * to prevent infinite recursion (ClauseAnalysis → RiskReport → ClauseAnalysis → ...).
     */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private RiskReport report;

    @Column(name = "clause_type", length = 100)
    private String clauseType;

    @Column(name = "clause_text", columnDefinition = "TEXT")
    private String clauseText;

    @Column(name = "risk_level", length = 50)
    private String riskLevel;

    @Column(name = "risk_reason", columnDefinition = "TEXT")
    private String riskReason;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;
}
