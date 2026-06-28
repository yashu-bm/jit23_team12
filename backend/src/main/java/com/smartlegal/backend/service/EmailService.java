package com.smartlegal.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            javaMailSender.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {} via SMTP. Falling back to console logger.", to);
            System.out.println("\n=================== [SMTP FALLBACK EMAIL LOGGER] ===================");
            System.out.println("FROM: " + fromEmail);
            System.out.println("TO: " + to);
            System.out.println("SUBJECT: " + subject);
            System.out.println("CONTENT:\n" + text);
            System.out.println("===================================================================\n");
        }
    }
}
