package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    @EntityGraph(attributePaths = {"user", "user.role", "lawyerProfile", "lawyerProfile.user", "lawyerProfile.user.role", "lawyerProfile.specializationCategory"}, type = EntityGraph.EntityGraphType.LOAD)
    List<Appointment> findByUserIdOrderByAppointmentDateDesc(Long userId);
    
    @EntityGraph(attributePaths = {"user", "user.role", "lawyerProfile", "lawyerProfile.user", "lawyerProfile.user.role", "lawyerProfile.specializationCategory"}, type = EntityGraph.EntityGraphType.LOAD)
    List<Appointment> findByLawyerProfileIdOrderByAppointmentDateDesc(Long lawyerProfileId);

    @EntityGraph(attributePaths = {"user", "user.role", "lawyerProfile", "lawyerProfile.user", "lawyerProfile.user.role", "lawyerProfile.specializationCategory"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<Appointment> findById(Long id);
}

