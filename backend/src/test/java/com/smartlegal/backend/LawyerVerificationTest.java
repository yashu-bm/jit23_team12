package com.smartlegal.backend;

import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@SpringBootTest
public class LawyerVerificationTest {

    @Autowired
    private LawyerProfileRepository lawyerProfileRepository;

    @Test
    @Transactional
    public void testLawyers() {
        System.out.println("================= DB TEST START =================");
        List<LawyerProfile> lawyers = lawyerProfileRepository.findAll();
        System.out.println("Total lawyers found: " + lawyers.size());
        
        for (LawyerProfile lp : lawyers) {
            System.out.println("Lawyer ID: " + lp.getId());
            System.out.println("Verification Status: " + lp.getVerificationStatus());
            System.out.println("Approved: " + lp.getIsApproved());
            System.out.println("Cert URL: " + lp.getAdvocateCertificateUrl());
            if (lp.getUser() != null) {
                System.out.println("User Name: " + lp.getUser().getFullName());
            } else {
                System.out.println("USER IS NULL!!!");
            }
            System.out.println("-------------------------------------------------");
        }
        System.out.println("================= DB TEST END ===================");
    }
}
