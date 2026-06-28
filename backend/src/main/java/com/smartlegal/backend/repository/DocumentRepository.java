package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LegalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<LegalDocument, Long> {
    List<LegalDocument> findByUserIdOrderByUploadDateDesc(Long userId);
}
