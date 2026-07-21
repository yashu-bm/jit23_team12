package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LawyerAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LawyerAvailabilityRepository extends JpaRepository<LawyerAvailability, Long> {
    List<LawyerAvailability> findByLawyerProfileId(Long lawyerId);
}
