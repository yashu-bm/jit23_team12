package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByLawyerId(Long lawyerId);
    List<Review> findByUserId(Long userId);
    boolean existsByAppointmentId(Long appointmentId);
    java.util.Optional<Review> findByAppointmentId(Long appointmentId);
}
