package com.smartlegal.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get("uploads");
        String uploadPath = uploadDir.toFile().getAbsolutePath();
        
        registry.addResourceHandler("/api/users/profile/photo-file/**")
                .addResourceLocations("file:" + uploadPath + "/");

        Path lawyerUploadDir = Paths.get("uploads/profile");
        String lawyerUploadPath = lawyerUploadDir.toFile().getAbsolutePath();
        registry.addResourceHandler("/uploads/profile/**")
                .addResourceLocations("file:" + lawyerUploadPath + "/");

        Path chatUploadDir = Paths.get("uploads/chat");
        String chatUploadPath = chatUploadDir.toFile().getAbsolutePath();
        registry.addResourceHandler("/uploads/chat/**")
                .addResourceLocations("file:" + chatUploadPath + "/");
    }
}
