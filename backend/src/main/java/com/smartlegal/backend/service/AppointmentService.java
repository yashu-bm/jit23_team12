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

    @Transactional
    public Appointment bookAppointment(Long userId, Long lawyerId,
                                       LocalDateTime appointmentDate,
                                       String notes, String meetingType,
                                       Long paymentId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User lawyer = userRepository.findById(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer not found"));
        LawyerProfile lawyerProfile = lawyerProfileRepository.findById(lawyerId)
                .orElseThrow(() -> new RuntimeException("Lawyer profile not found"));

        // Validate Availability
        List<com.smartlegal.backend.entity.LawyerAvailability> availabilities = lawyerAvailabilityRepository.findByLawyerProfileId(lawyerId);
            
            boolean isAvailable = false;
            boolean isExplicitlyUnavailable = false;

            int dayOfWeek = appointmentDate.getDayOfWeek().getValue();
            java.time.LocalDate date = appointmentDate.toLocalDate();
            java.time.LocalTime time = appointmentDate.toLocalTime();

            for (com.smartlegal.backend.entity.LawyerAvailability avail : availabilities) {
                boolean matchesDate = avail.getDate() != null && avail.getDate().equals(date);
                boolean matchesDay = avail.getDayOfWeek() != null && avail.getDayOfWeek() == dayOfWeek;

                if (matchesDate || matchesDay) {
                    // If it's an all-day block (no start/end time specified) or falls within the time range
                    boolean withinTime = true;
                    if (avail.getStartTime() != null && avail.getEndTime() != null) {
                        withinTime = !time.isBefore(avail.getStartTime()) && time.isBefore(avail.getEndTime());
                    }

                    if (withinTime) {
                        if (avail.getIsAvailable()) {
                            isAvailable = true;
                        } else {
                            isExplicitlyUnavailable = true;
                        }
                    }
                }
            }

            if (isExplicitlyUnavailable) {
                throw new RuntimeException("Lawyer is unavailable on this date/time.");
            }
            if (!isAvailable && !availabilities.isEmpty()) {
                throw new RuntimeException("Selected time is outside the lawyer's working hours.");
            }

            // Check for overlapping appointments
            List<Appointment> existingAppointments = appointmentRepository.findByLawyerProfileIdOrderByAppointmentDateDesc(lawyerId);
            for (Appointment existing : existingAppointments) {
                if ("PENDING".equals(existing.getStatus()) || "CONFIRMED".equals(existing.getStatus()) || "PAID".equals(existing.getStatus())) {
                    LocalDateTime existingStart = existing.getAppointmentDate();
                    LocalDateTime existingEnd = existingStart.plusMinutes(existing.getDurationMinutes());
                    LocalDateTime requestedStart = appointmentDate;
                    LocalDateTime requestedEnd = requestedStart.plusMinutes(60); // Default duration 60

                    if (requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart)) {
                        throw new RuntimeException("Slot is already booked. Please choose another available slot.");
                    }
                }
            }

        Appointment appointment = Appointment.builder()
                .user(user)
                .lawyerProfile(lawyerProfile)
                .appointmentDate(appointmentDate)
                .durationMinutes(60)
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
