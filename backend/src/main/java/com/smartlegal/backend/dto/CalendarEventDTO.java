package com.smartlegal.backend.dto;

import lombok.Data;

@Data
public class CalendarEventDTO {
    private String id;
    private String title;
    private String start; // ISO format
    private String end; // ISO format
    private String type; // "AVAILABLE", "UNAVAILABLE", "BOOKED", "COMPLETED"
    private String status; // Also typically matches type for the frontend
    private String reason;
    private Long originalAvailabilityId; // for edits
    private Boolean allDay;
    private Integer duration;
    private Integer maxAppointments;
}
