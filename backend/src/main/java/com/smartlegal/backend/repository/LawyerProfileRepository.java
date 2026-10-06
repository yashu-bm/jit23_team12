package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.LawyerProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface LawyerProfileRepository extends JpaRepository<LawyerProfile, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT lp FROM LawyerProfile lp WHERE lp.id = :id")
    Optional<LawyerProfile> findByIdForUpdate(Long id);

    Page<LawyerProfile> findAll(Pageable pageable);

    @Query(value = "SELECT lp FROM LawyerProfile lp LEFT JOIN FETCH lp.user",
           countQuery = "SELECT count(lp) FROM LawyerProfile lp")
    Page<LawyerProfile> findAllWithUser(Pageable pageable);

    List<LawyerProfile> findByIsApprovedTrue();

    @Query("SELECT lp FROM LawyerProfile lp WHERE lp.isApproved = true AND lp.availabilityStatus = 'AVAILABLE'")
    List<LawyerProfile> findAvailableApprovedLawyers();
}
