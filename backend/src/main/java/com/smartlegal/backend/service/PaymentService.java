package com.smartlegal.backend.service;

import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.smartlegal.backend.entity.LawyerEarning;
import com.smartlegal.backend.entity.Payment;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.LawyerEarningRepository;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.PaymentRepository;
import com.smartlegal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final LawyerProfileRepository lawyerProfileRepository;
    private final LawyerEarningRepository lawyerEarningRepository;
    private final EmailService emailService;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Value("${razorpay.platform-fee-percent:10}")
    private int platformFeePercent;

    private RazorpayClient razorpayClient;
    private boolean razorpayEnabled = false;

    @PostConstruct
    public void init() {
        if (!keyId.contains("YOUR_KEY_ID") && !keyId.isBlank()) {
            try {
                this.razorpayClient = new RazorpayClient(keyId, keySecret);
                razorpayEnabled = true;
                log.info("Razorpay client initialized successfully.");
            } catch (Exception e) {
                log.error("Failed to initialize Razorpay Client: {}", e.getMessage());
            }
        } else {
            log.warn("Razorpay API keys not configured. Running in MOCK payment mode.");
        }
    }

    @Transactional
    public Payment createOrder(Long userId, BigDecimal amount, Long lawyerId, Long appointmentId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!razorpayEnabled) {
            // Mock order for development/testing
            log.warn("Creating MOCK Razorpay order (keys not configured).");
            Payment payment = Payment.builder()
                    .user(user)
                    .amount(amount)
                    .lawyerId(lawyerId)
                    .appointmentId(appointmentId)
                    .razorpayOrderId("mock_order_" + System.currentTimeMillis())
                    .paymentStatus("CREATED")
                    .currency("INR")
                    .createdAt(LocalDateTime.now())
                    .build();
            return paymentRepository.save(payment);
        }

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount.multiply(new BigDecimal("100")).intValue()); // paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "rcpt_" + System.currentTimeMillis());

            com.razorpay.Order razorpayOrder = razorpayClient.orders.create(orderRequest);

            Payment payment = Payment.builder()
                    .user(user)
                    .amount(amount)
                    .lawyerId(lawyerId)
                    .appointmentId(appointmentId)
                    .razorpayOrderId(razorpayOrder.get("id"))
                    .paymentStatus(razorpayOrder.get("status").toString())
                    .currency("INR")
                    .createdAt(LocalDateTime.now())
                    .build();

            return paymentRepository.save(payment);
        } catch (Exception e) {
            log.error("Error creating Razorpay order: {}", e.getMessage());
            throw new RuntimeException("Could not create payment order: " + e.getMessage());
        }
    }

    @Transactional
    public Payment verifyPayment(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new RuntimeException("Payment order not found"));

        // Verify signature (HMAC-SHA256)
        if (razorpayEnabled && !razorpaySignature.startsWith("mock_")) {
            try {
                JSONObject attributes = new JSONObject();
                attributes.put("razorpay_order_id", razorpayOrderId);
                attributes.put("razorpay_payment_id", razorpayPaymentId);
                attributes.put("razorpay_signature", razorpaySignature);
                Utils.verifyPaymentSignature(attributes, keySecret);
            } catch (Exception e) {
                log.error("Payment signature verification failed: {}", e.getMessage());
                payment.setPaymentStatus("FAILED");
                paymentRepository.save(payment);
                throw new RuntimeException("Payment verification failed. Invalid signature.");
            }
        }

        payment.setRazorpayPaymentId(razorpayPaymentId);
        payment.setRazorpaySignature(razorpaySignature);
        payment.setPaymentStatus("SUCCESS");
        Payment saved = paymentRepository.save(payment);

        // Record lawyer earning
        recordLawyerEarning(saved);

        // Send confirmation email
        try {
            emailService.sendSimpleMessage(
                    payment.getUser().getEmail(),
                    "Payment Successful — Smart Legal",
                    "Hello " + payment.getUser().getFirstName() + ",\n\n" +
                    "Your payment of ₹" + payment.getAmount() + " was processed successfully.\n" +
                    "Transaction ID: " + razorpayPaymentId + "\n" +
                    "Order ID: " + razorpayOrderId + "\n\n" +
                    "Thank you for using Smart Legal Assistance.\n\n" +
                    "— Smart Legal Assistance Team"
            );
        } catch (Exception e) {
            log.warn("Could not send payment confirmation email: {}", e.getMessage());
        }

        return saved;
    }

    private void recordLawyerEarning(Payment payment) {
        if (payment.getLawyerId() == null) return;
        try {
            BigDecimal gross = payment.getAmount();
            BigDecimal platformFee = gross.multiply(new BigDecimal(platformFeePercent))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal net = gross.subtract(platformFee);

            LawyerEarning earning = LawyerEarning.builder()
                    .lawyerId(payment.getLawyerId())
                    .appointmentId(payment.getAppointmentId())
                    .amount(gross)
                    .platformFee(platformFee)
                    .netAmount(net)
                    .build();
            lawyerEarningRepository.save(earning);
        } catch (Exception e) {
            log.error("Failed to record lawyer earning: {}", e.getMessage());
        }
    }

    public String getKeyId() {
        return keyId.contains("YOUR_KEY_ID") ? "rzp_test_placeholder" : keyId;
    }
}

