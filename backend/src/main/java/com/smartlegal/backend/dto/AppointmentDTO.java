package com.smartlegal.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDTO {
    private Long id;
    private Long userId;
    private String userName;
    private Long lawyerId;
    private String lawyerName;
    private String lawyerEmail;
    private LocalDateTime appointmentDate;
    private int durationMinutes;
    private String status;
    private String meetingType;
    private String meetingLink;
    private String notes;
    private String cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
