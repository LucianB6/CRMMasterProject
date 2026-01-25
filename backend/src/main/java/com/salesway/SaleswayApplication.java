package com.salesway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SaleswayApplication {
    public static void main(String[] args) {
        SpringApplication.run(SaleswayApplication.class, args);
    }
}
