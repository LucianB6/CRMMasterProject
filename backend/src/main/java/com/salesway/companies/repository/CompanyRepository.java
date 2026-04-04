package com.salesway.companies.repository;

import com.salesway.companies.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    long countByIsActiveTrue();

    Optional<Company> findByStripeCustomerId(String stripeCustomerId);

    Optional<Company> findByStripeSubscriptionId(String stripeSubscriptionId);
}
