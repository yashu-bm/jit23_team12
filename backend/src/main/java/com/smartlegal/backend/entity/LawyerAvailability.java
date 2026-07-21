package com.smartlegal.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "lawyer_availabilities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LawyerAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lawyer_id", nullable = false, referencedColumnName = "user_id")
    private LawyerProfile lawyerProfile;

    // If dayOfWeek is set, this is a recurring availability (1=Monday, ..., 7=Sunday)
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    // If date is set, this is a specific date override (e.g. vacation or one-off availability)
    @Column(name = "specific_date")
    private LocalDate date;

    // Optional end date for multi-day vacations
    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    // true if available, false if marked as unavailable (like vacation or blocked time)
    @Column(name = "is_available", nullable = false)
    @Builder.Default
    private Boolean isAvailable = true;

    // e.g. VACATION, HOLIDAY, GENERAL
    @Column(name = "reason")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
