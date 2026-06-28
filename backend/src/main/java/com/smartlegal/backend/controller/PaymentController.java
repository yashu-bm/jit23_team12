package com.smartlegal.backend.controller;

import com.smartlegal.backend.entity.Payment;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.PaymentRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @PostMapping("/create-order")
    public ResponseEntity<Payment> createOrder(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        Long lawyerId = payload.containsKey("lawyerId") ? Long.valueOf(payload.get("lawyerId").toString()) : null;
        Long appointmentId = payload.containsKey("appointmentId") ? Long.valueOf(payload.get("appointmentId").toString()) : null;

        return ResponseEntity.ok(paymentService.createOrder(userId, amount, lawyerId, appointmentId));
    }

    @PostMapping("/verify")
    public ResponseEntity<Payment> verifyPayment(@RequestBody Map<String, String> payload) {
        String razorpayOrderId = payload.get("razorpayOrderId");
        String razorpayPaymentId = payload.get("razorpayPaymentId");
        String razorpaySignature = payload.get("razorpaySignature");
        return ResponseEntity.ok(paymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Payment>> getMyPayments() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        // Returns the Razorpay key_id to frontend (never the secret)
        return ResponseEntity.ok(Map.of("keyId", paymentService.getKeyId()));
    }
}
