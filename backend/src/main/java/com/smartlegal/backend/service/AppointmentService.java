package com.smartlegal.backend.service;

import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.Payment;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.PaymentRepository;
import com.smartlegal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final PaymentRepository paymentRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.smartlegal.backend.repository.LawyerAvailabilityRepository lawyerAvailabilityRepository;
    private final LawyerAvailabilityService lawyerAvailabilityService;

    @Transactional
    public Appointment bookAppointment(Long userId, Long lawyerId,
                                       LocalDateTime appointmentDate,
                                       String notes, String meetingType,
                                       Long paymentId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User lawyer = userRepository.findById(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer not found"));
        if (appointmentDate.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot book appointments in the past.");
        }

        // Lock the profile to prevent concurrent double-booking on the exact same lawyer slot
        LawyerProfile lawyerProfile = lawyerProfileRepository.findByIdForUpdate(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        // Validate Availability using the Single Source of Truth
        String dateStr = appointmentDate.toLocalDate().toString();
        List<java.util.Map<String, Object>> slots = lawyerAvailabilityService.getAvailableSlots(lawyerId, dateStr);
        String requestedTimeStr = appointmentDate.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
        
        boolean isAvailable = false;
        boolean isBlocked = true;
        int duration = lawyerProfile.getSlotDuration() != null && lawyerProfile.getSlotDuration() > 0 ? lawyerProfile.getSlotDuration() : 60;
        
        for (java.util.Map<String, Object> slot : slots) {
            if (slot.get("time").equals(requestedTimeStr)) {
                isAvailable = true;
                duration = (int) slot.get("duration");
                int remaining = (int) slot.get("remainingCapacity");
                if (remaining > 0) {
                    isBlocked = false;
                }
                break;
            }
        }
        
        if (!isAvailable) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Selected time is outside the lawyer's working hours.");
        }
        if (isBlocked) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Slot is already fully booked.");
        }
        
        // Double check against DB for concurrently booked appointments matching this exact time range
        LocalDateTime endAppointmentDate = appointmentDate.plusMinutes(duration);
        List<Appointment> existingApts = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(lawyerId);
        long currentDbBookings = existingApts.stream()
            .filter(a -> "PENDING".equals(a.getStatus()) || "CONFIRMED".equals(a.getStatus()) || "PAID".equals(a.getStatus()) || "COMPLETED".equals(a.getStatus()))
            .filter(a -> {
                LocalDateTime aStart = a.getAppointmentDate();
                LocalDateTime aEnd = aStart.plusMinutes(a.getDurationMinutes() > 0 ? a.getDurationMinutes() : 60);
                return appointmentDate.isBefore(aEnd) && endAppointmentDate.isAfter(aStart);
            }).count();
            
        // Look up maxAppointments for this slot from slots logic, if it was > 1
        int maxCap = 1;
        for (java.util.Map<String, Object> slot : slots) {
            if (slot.get("time").equals(requestedTimeStr)) {
                maxCap = (int) slot.get("maxAppointments");
                break;
            }
        }
        
        if (currentDbBookings >= maxCap) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Slot was just booked by another client. Please choose another time.");
        }

        Appointment appointment = Appointment.builder()
                .user(user)
                .lawyerProfile(lawyerProfile)
                .appointmentDate(appointmentDate)
                .durationMinutes(duration)
                .notes(notes)
                .meetingType(meetingType != null ? meetingType : "ONLINE")
                .status("PENDING")
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        // Link payment to this appointment if provided
        if (paymentId != null) {
            paymentRepository.findById(paymentId).ifPresent(payment -> {
                payment.setAppointmentId(saved.getId());
                paymentRepository.save(payment);
            });
        }

        // Email notifications
        try {
            emailService.sendSimpleMessage(
                    user.getEmail(),
                    "Appointment Booked Successfully — Smart Legal",
                    "Hello " + user.getFirstName() + ",\n\n" +
                    "Your appointment with Adv. " + lawyer.getFullName() + " has been booked.\n" +
                    "Date & Time: " + appointmentDate + "\n\n" +
                    "You will be notified once the lawyer confirms.\n\n" +
                    "— Smart Legal Assistance Team"
            );
            emailService.sendSimpleMessage(
                    lawyer.getEmail(),
                    "New Appointment Request — Smart Legal",
                    "Hello Adv. " + lawyer.getFirstName() + ",\n\n" +
                    "You have a new appointment request from " + user.getFullName() + ".\n" +
                    "Date & Time: " + appointmentDate + "\n" +
                    "Notes: " + (notes != null ? notes : "None") + "\n\n" +
                    "Please log in to confirm or reject.\n\n" +
                    "— Smart Legal Assistance Team"
            );
        } catch (Exception e) {
            // Email failure should not fail the booking
        }

        // Notification: Client
        notificationService.createAndSendNotification(
                user,
                "Appointment Request Submitted",
                "Your appointment request with Adv. " + lawyer.getFullName() + " has been submitted.",
                "APPOINTMENT",
                "/dashboard"
        );

        // Notification: Lawyer
        notificationService.createAndSendNotification(
                lawyer,
                "New Appointment Request",
                "You have a new appointment request from " + user.getFullName() + ".",
                "APPOINTMENT",
                "/lawyer-dashboard"
        );

        return saved;
    }

    public List<Appointment> getUserAppointments(Long userId) {
        return appointmentRepository.findByUserIdOrderByAppointmentDateDesc(userId);
    }

    public List<Appointment> getLawyerAppointments(Long lawyerId) {
        return appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(lawyerId);
    }

    @Transactional
    public Appointment updateAppointmentStatus(Long appointmentId, String status, String cancellationReason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        appointment.setStatus(status);
        if ("CONFIRMED".equals(status)) {
            appointment.setAcceptedAt(LocalDateTime.now());
        } else if ("COMPLETED".equals(status)) {
            appointment.setCompletedAt(LocalDateTime.now());
        }
        
        if (cancellationReason != null && !cancellationReason.isEmpty()) {
            appointment.setCancellationReason(cancellationReason);
        }
        Appointment updated = appointmentRepository.save(appointment);

        // Notify user of status change
        try {
            emailService.sendSimpleMessage(
                    appointment.getUser().getEmail(),
                    "Appointment Status Updated — Smart Legal",
                    "Hello " + appointment.getUser().getFirstName() + ",\n\n" +
                    "Your appointment status has been updated to: " + status + "\n" +
                    (cancellationReason != null ? "Reason: " + cancellationReason + "\n" : "") +
                    "\nLog in to view details.\n\n" +
                    "— Smart Legal Assistance Team"
            );
        } catch (Exception e) {
            // Email failure should not fail the update
        }

        // Notifications
        User client = appointment.getUser();
        User lawyer = appointment.getLawyerProfile().getUser();

        if ("CONFIRMED".equals(status)) {
            notificationService.createAndSendNotification(
                    client,
                    "Appointment Accepted",
                    "Your appointment with Adv. " + lawyer.getFullName() + " has been accepted.",
                    "APPOINTMENT",
                    "/dashboard"
            );
        } else if ("REJECTED".equals(status) || "CANCELLED".equals(status)) {
            notificationService.createAndSendNotification(
                    client,
                    "Appointment " + (status.equals("REJECTED") ? "Rejected" : "Cancelled"),
                    "Your appointment with Adv. " + lawyer.getFullName() + " has been " + status.toLowerCase() + ".",
                    "APPOINTMENT",
                    "/dashboard"
            );
            if ("CANCELLED".equals(status)) {
                notificationService.createAndSendNotification(
                        lawyer,
                        "Appointment Cancelled",
                        "Appointment with " + client.getFullName() + " has been cancelled.",
                        "APPOINTMENT",
                        "/lawyer-dashboard"
                );
            }
        } else if ("COMPLETED".equals(status)) {
            notificationService.createAndSendNotification(
                    client,
                    "Consultation Completed",
                    "Your consultation with Adv. " + lawyer.getFullName() + " is completed. Please leave a review.",
                    "REVIEW",
                    "/dashboard"
            );
            notificationService.createAndSendNotification(
                    lawyer,
                    "Consultation Marked Completed",
                    "Consultation with " + client.getFullName() + " marked as completed.",
                    "APPOINTMENT",
                    "/lawyer-dashboard"
            );
        }

        return updated;
    }

    @Transactional
    public Appointment markChatStarted(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        if (appointment.getChatStartedAt() == null) {
            appointment.setChatStartedAt(LocalDateTime.now());
            return appointmentRepository.save(appointment);
        }
        return appointment;
    }
}
