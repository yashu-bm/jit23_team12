package com.smartlegal.backend.repository;

import com.smartlegal.backend.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findByUserEmailAndOtpCodeAndOtpTypeAndIsUsedFalse(String email, String otpCode, String otpType);
    
    List<OtpToken> findByUserEmailAndOtpTypeAndIsUsedFalse(String email, String otpType);
    
    Optional<OtpToken> findTopByUserEmailAndOtpTypeOrderByIdDesc(String email, String otpType);
}
