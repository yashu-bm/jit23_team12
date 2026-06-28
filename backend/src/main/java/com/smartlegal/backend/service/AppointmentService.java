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

        Appointment appointment = Appointment.builder()
                .user(user)
                .lawyerProfile(lawyerProfile)
                .appointmentDate(appointmentDate)
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

        return updated;
    }
}
