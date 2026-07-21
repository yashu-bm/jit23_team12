package com.smartlegal.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartLegalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartLegalBackendApplication.class, args);
    }
}
