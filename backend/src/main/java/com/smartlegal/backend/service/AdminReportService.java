package com.smartlegal.backend.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.smartlegal.backend.entity.Appointment;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.Payment;
import com.smartlegal.backend.repository.AppointmentRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.PaymentRepository;
import com.smartlegal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReportService {

    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository paymentRepository;

    public byte[] generateSystemReportPdf() {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);
            
            // Header
            Paragraph header = new Paragraph("Smart Legal Assistance System - Admin Report")
                    .setBold()
                    .setFontSize(20)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.BLUE);
            document.add(header);
            
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String generationTime = LocalDateTime.now().format(formatter);
            String reportId = "REP-" + System.currentTimeMillis();
            
            document.add(new Paragraph("Report ID: " + reportId).setFontSize(10).setTextAlignment(TextAlignment.RIGHT));
            document.add(new Paragraph("Generated At: " + generationTime).setFontSize(10).setTextAlignment(TextAlignment.RIGHT));
            document.add(new Paragraph("\n"));

            // Stats Gathering
            long totalUsers = userRepository.count();
            long totalLawyers = lawyerProfileRepository.count();
            long totalAppointments = appointmentRepository.count();
            List<Payment> allPayments = paymentRepository.findAll();
            BigDecimal totalRevenue = allPayments.stream()
                    .filter(p -> "SUCCESS".equalsIgnoreCase(p.getPaymentStatus()))
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Table 1: Overview
            document.add(new Paragraph("1. System Overview").setBold().setFontSize(14));
            Table overviewTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
            overviewTable.addHeaderCell(new Cell().add(new Paragraph("Metric").setBold()));
            overviewTable.addHeaderCell(new Cell().add(new Paragraph("Value").setBold()));
            
            overviewTable.addCell("Total Users");
            overviewTable.addCell(String.valueOf(totalUsers));
            overviewTable.addCell("Total Lawyers");
            overviewTable.addCell(String.valueOf(totalLawyers));
            overviewTable.addCell("Total Appointments");
            overviewTable.addCell(String.valueOf(totalAppointments));
            overviewTable.addCell("Total Revenue");
            overviewTable.addCell("INR " + totalRevenue.toString());
            document.add(overviewTable);
            document.add(new Paragraph("\n"));

            // Table 2: Pending Approvals
            document.add(new Paragraph("2. Pending Lawyer Approvals").setBold().setFontSize(14));
            List<LawyerProfile> pendingLawyers = lawyerProfileRepository.findAll().stream()
                    .filter(l -> !Boolean.TRUE.equals(l.getIsApproved())).toList();
            
            if (pendingLawyers.isEmpty()) {
                document.add(new Paragraph("No pending approvals."));
            } else {
                Table lawyerTable = new Table(UnitValue.createPercentArray(new float[]{40, 30, 30})).useAllAvailableWidth();
                lawyerTable.addHeaderCell(new Cell().add(new Paragraph("Name").setBold()));
                lawyerTable.addHeaderCell(new Cell().add(new Paragraph("City").setBold()));
                lawyerTable.addHeaderCell(new Cell().add(new Paragraph("Experience").setBold()));
                
                for (LawyerProfile lp : pendingLawyers) {
                    lawyerTable.addCell(lp.getUser() != null ? lp.getUser().getFullName() : "Unknown");
                    lawyerTable.addCell(lp.getCity() != null ? lp.getCity() : "-");
                    lawyerTable.addCell(lp.getExperienceYears() != null ? lp.getExperienceYears() + " yrs" : "-");
                }
                document.add(lawyerTable);
            }
            document.add(new Paragraph("\n"));

            // Table 3: Pending Appointments
            document.add(new Paragraph("3. Pending Appointments").setBold().setFontSize(14));
            List<Appointment> pendingAppointments = appointmentRepository.findAll().stream()
                    .filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).toList();
            
            if (pendingAppointments.isEmpty()) {
                document.add(new Paragraph("No pending appointments."));
            } else {
                Table emergencyTable = new Table(UnitValue.createPercentArray(new float[]{30, 40, 30})).useAllAvailableWidth();
                emergencyTable.addHeaderCell(new Cell().add(new Paragraph("Client").setBold()));
                emergencyTable.addHeaderCell(new Cell().add(new Paragraph("Requested Date").setBold()));
                emergencyTable.addHeaderCell(new Cell().add(new Paragraph("Status").setBold()));
                
                for (Appointment app : pendingAppointments) {
                    emergencyTable.addCell(app.getUser() != null ? app.getUser().getFullName() : "Unknown");
                    emergencyTable.addCell(app.getAppointmentDate() != null ? app.getAppointmentDate().toString() : "-");
                    emergencyTable.addCell(app.getStatus());
                }
                document.add(emergencyTable);
            }
            document.add(new Paragraph("\n"));
            
            // Footer
            document.add(new Paragraph("Generated by Smart Legal Assistance System")
                    .setFontSize(8)
                    .setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.CENTER));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error generating PDF report");
        }
    }
}
