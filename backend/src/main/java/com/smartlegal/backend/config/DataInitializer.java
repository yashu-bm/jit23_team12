package com.smartlegal.backend.config;

import com.smartlegal.backend.entity.Category;
import com.smartlegal.backend.entity.ERole;
import com.smartlegal.backend.entity.Role;
import com.smartlegal.backend.repository.CategoryRepository;
import com.smartlegal.backend.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) {
        initRoles();
        initCategories();
    }

    private void initRoles() {
        for (ERole role : ERole.values()) {
            if (roleRepository.findByName(role).isEmpty()) {
                roleRepository.save(new Role(role));
                log.info("Created role: {}", role);
            }
        }
    }

    private void initCategories() {
        List<String> categories = List.of(
            "Criminal", "Family", "Property", "Corporate",
            "Cyber Crime", "Labour", "Tax", "Consumer",
            "Civil", "Intellectual Property", "Constitutional",
            "Immigration", "Banking", "Environmental", "Medical"
        );

        for (String name : categories) {
            if (categoryRepository.findByName(name).isEmpty()) {
                Category cat = new Category();
                cat.setName(name);
                categoryRepository.save(cat);
                log.info("Created category: {}", name);
            }
        }
    }
}
