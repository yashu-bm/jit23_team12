package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByUserIdOrderByAppointmentDateDesc(Long userId);
    List<Appointment> findByLawyerProfileIdOrderByAppointmentDateDesc(Long lawyerProfileId);
}

