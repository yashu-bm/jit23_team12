package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.Review;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.ReviewRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long appointmentId = Long.valueOf(payload.get("appointmentId").toString());
        int rating = Integer.parseInt(payload.get("rating").toString());
        String reviewText = (String) payload.get("reviewText");

        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5"));
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        // Verify currently logged in user is the owner
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        if (!appointment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You cannot rate this appointment"));
        }

        // Verify status
        if (!"COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You can only rate completed appointments"));
        }

        // Check duplicate review
        if (reviewRepository.existsByAppointmentId(appointmentId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "You have already reviewed this appointment"));
        }

        Long lawyerId = appointment.getLawyerProfile().getId();

        Review review = Review.builder()
                .appointmentId(appointmentId)
                .userId(user.getId())
                .lawyerId(lawyerId)
                .rating(rating)
                .reviewText(reviewText)
                .build();

        reviewRepository.save(review);

        // Update lawyer stats
        LawyerProfile lawyerProfile = lawyerProfileRepository.findById(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        List<Review> reviews = reviewRepository.findByLawyerId(lawyerId);
        int totalReviews = reviews.size();
        double sum = reviews.stream().mapToDouble(Review::getRating).sum();
        double avgRating = sum / totalReviews;

        lawyerProfile.setTotalReviews(totalReviews);
        lawyerProfile.setAverageRating(BigDecimal.valueOf(avgRating).setScale(2, RoundingMode.HALF_UP));
        lawyerProfileRepository.save(lawyerProfile);

        auditLogService.logActivity(user, "SUBMIT_REVIEW", "User reviewed lawyer ID: " + lawyerId + " with rating: " + rating, request);

        return ResponseEntity.ok(Map.of("message", "Review submitted successfully", "averageRating", avgRating));
    }

    @GetMapping("/lawyer/{lawyerId}")
    public ResponseEntity<List<Review>> getLawyerReviews(@PathVariable Long lawyerId) {
        return ResponseEntity.ok(reviewRepository.findByLawyerId(lawyerId));
    }
}
