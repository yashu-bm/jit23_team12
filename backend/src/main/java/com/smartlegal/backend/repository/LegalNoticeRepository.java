package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LegalNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LegalNoticeRepository extends JpaRepository<LegalNotice, Long> {
    List<LegalNotice> findByUserIdOrderByCreatedAtDesc(Long userId);
}
