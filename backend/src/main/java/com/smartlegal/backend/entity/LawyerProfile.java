package com.smartlegal.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lawyer_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LawyerProfile {

    @Id
    @Column(name = "user_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "specialization_category_id")
    private Category specializationCategory;

    @Column(name = "experience_years")
    private Integer experienceYears;

    private String qualification;
    private String city;

    @Column(length = 100)
    private String state;

    private String languages;

    @Column(name = "bar_council_number", length = 100)
    private String barCouncilNumber;

    @Column(name = "consultation_fee")
    private BigDecimal consultationFee;

    @Column(name = "availability_status", length = 30)
    @Builder.Default
    private String availabilityStatus = "AVAILABLE";

    @Column(name = "is_approved")
    @Builder.Default
    private Boolean isApproved = false;

    @Column(name = "verification_status", length = 30)
    @Builder.Default
    private String verificationStatus = "PENDING";

    @Column(name = "admin_remarks", columnDefinition = "TEXT")
    private String adminRemarks;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "advocate_certificate_url")
    private String advocateCertificateUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "success_rate")
    private BigDecimal successRate;

    @Column(name = "average_rating")
    @Builder.Default
    private BigDecimal averageRating = BigDecimal.ZERO;

    @Column(name = "total_cases")
    @Builder.Default
    private int totalCases = 0;

    @Column(name = "successful_cases")
    @Builder.Default
    private int successfulCases = 0;

    @Column(name = "total_reviews")
    @Builder.Default
    private int totalReviews = 0;

    @Column(name = "profile_completion")
    @Builder.Default
    private int profileCompletion = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "working_days", length = 50)
    @Builder.Default
    private String workingDays = "1,2,3,4,5"; // Default Mon-Fri
    
    @Column(name = "start_working_time")
    @Builder.Default
    private java.time.LocalTime startWorkingTime = java.time.LocalTime.of(9, 0);
    
    @Column(name = "end_working_time")
    @Builder.Default
    private java.time.LocalTime endWorkingTime = java.time.LocalTime.of(18, 0);
    
    @Column(name = "slot_duration")
    @Builder.Default
    private Integer slotDuration = 30; // 30 minutes default
    
    @Column(name = "lunch_break_start")
    private java.time.LocalTime lunchBreakStart;
    
    @Column(name = "lunch_break_end")
    private java.time.LocalTime lunchBreakEnd;
}
