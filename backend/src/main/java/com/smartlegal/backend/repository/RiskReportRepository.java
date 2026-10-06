package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.RiskReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RiskReportRepository extends JpaRepository<RiskReport, Long> {
    Optional<RiskReport> findByDocumentId(Long documentId);
}
