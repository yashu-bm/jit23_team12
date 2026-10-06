package com.smartlegal.backend.util;

import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class ImageUtils {

    public static byte[] processProfileImage(MultipartFile file) throws IOException {
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        if (originalImage == null) {
            throw new IllegalArgumentException("Invalid image file or unsupported format");
        }

        // Crop to square
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();
        int minDimension = Math.min(width, height);
        int x = (width - minDimension) / 2;
        int y = (height - minDimension) / 2;
        BufferedImage croppedImage = originalImage.getSubimage(x, y, minDimension, minDimension);

        // Resize to 400x400
        int targetSize = 400;
        Image scaledImg = croppedImage.getScaledInstance(targetSize, targetSize, Image.SCALE_SMOOTH);
        BufferedImage resizedImage = new BufferedImage(targetSize, targetSize, BufferedImage.TYPE_INT_RGB);

        Graphics2D g2d = resizedImage.createGraphics();
        // Set background to white for transparent images like PNG
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, targetSize, targetSize);
        g2d.drawImage(scaledImg, 0, 0, null);
        g2d.dispose();

        // Write as JPG
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(resizedImage, "jpg", baos);
        return baos.toByteArray();
    }
}
