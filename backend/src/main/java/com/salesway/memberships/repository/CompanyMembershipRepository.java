package com.salesway.memberships.repository;

import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CompanyMembershipRepository extends JpaRepository<CompanyMembership, UUID> {
}
