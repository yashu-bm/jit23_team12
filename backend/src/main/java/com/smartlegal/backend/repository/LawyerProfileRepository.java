package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LawyerProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LawyerProfileRepository extends JpaRepository<LawyerProfile, Long> {

    Page<LawyerProfile> findAll(Pageable pageable);

    List<LawyerProfile> findByIsApprovedTrue();

    @Query("SELECT lp FROM LawyerProfile lp WHERE lp.isApproved = true AND lp.availabilityStatus = 'AVAILABLE'")
    List<LawyerProfile> findAvailableApprovedLawyers();
}
