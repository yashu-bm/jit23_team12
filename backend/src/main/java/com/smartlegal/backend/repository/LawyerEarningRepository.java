package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LawyerEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LawyerEarningRepository extends JpaRepository<LawyerEarning, Long> {
    List<LawyerEarning> findByLawyerIdOrderByCreatedAtDesc(Long lawyerId);
}
