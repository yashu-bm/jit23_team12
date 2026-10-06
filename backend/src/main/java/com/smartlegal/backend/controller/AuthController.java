package com.smartlegal.backend.controller;

import com.smartlegal.backend.dto.JwtResponse;
import com.smartlegal.backend.dto.LoginRequest;
import com.smartlegal.backend.dto.MessageResponse;
import com.smartlegal.backend.dto.SignupRequest;
import com.smartlegal.backend.entity.ERole;
import com.smartlegal.backend.entity.LawyerProfile;
import com.smartlegal.backend.entity.Role;
import com.smartlegal.backend.entity.User;
import com.smartlegal.backend.repository.LawyerProfileRepository;
import com.smartlegal.backend.repository.RoleRepository;
import com.smartlegal.backend.repository.UserRepository;
import com.smartlegal.backend.security.JwtUtils;
import com.smartlegal.backend.security.UserDetailsImpl;
import com.smartlegal.backend.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    LawyerProfileRepository lawyerProfileRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    NotificationService notificationService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        User user = userRepository.findByEmail(userDetails.getEmail()).get();

        boolean isLawyer = roles.contains("ROLE_LAWYER");
        notificationService.createAndSendNotification(
                user,
                isLawyer ? "Welcome back!" : "Login Successful",
                isLawyer ? "Welcome back to your Lawyer Dashboard." : "Welcome back to Smart Legal Assistance.",
                "SYSTEM",
                isLawyer ? "/lawyer-dashboard" : "/dashboard"
        );

        return ResponseEntity.ok(new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                roles));
    }

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        User user = new User(
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()),
                signUpRequest.getFirstName(),
                signUpRequest.getLastName());

        String strRole = signUpRequest.getRole();
        Role userRole;

        if (strRole == null) {
            userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.ROLE_USER)));
        } else {
            switch (strRole.toLowerCase()) {
                case "admin":
                    userRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseGet(() -> roleRepository.save(new Role(ERole.ROLE_ADMIN)));
                    break;

                case "lawyer":
                    userRole = roleRepository.findByName(ERole.ROLE_LAWYER)
                            .orElseGet(() -> roleRepository.save(new Role(ERole.ROLE_LAWYER)));
                    break;

                default:
                    userRole = roleRepository.findByName(ERole.ROLE_USER)
                            .orElseGet(() -> roleRepository.save(new Role(ERole.ROLE_USER)));
                    break;
            }
        }

        user.setRole(userRole);
        User savedUser = userRepository.save(user);

        if (userRole.getName() == ERole.ROLE_LAWYER) {
            LawyerProfile profile = new LawyerProfile();
            // Re-fetch the user as a managed entity reference within this transaction.
            // @MapsId requires the associated entity to be attached to the current
            // persistence context. Using getReferenceById() returns a managed proxy,
            // preventing the "detached entity passed to persist" Hibernate error.
            User managedUser = userRepository.getReferenceById(savedUser.getId());
            profile.setUser(managedUser);
            profile.setIsApproved(false);
            profile.setVerificationStatus("PENDING");
            lawyerProfileRepository.save(profile);
        }

        notificationService.createAndSendNotification(
                savedUser,
                "Welcome to Smart Legal!",
                "Your account has been created successfully.",
                "SYSTEM",
                "/dashboard"
        );

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser() {
        return ResponseEntity.ok(new MessageResponse("Logout successful"));
    }
}