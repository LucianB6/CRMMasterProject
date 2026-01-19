package com.salesway.teams.repository;

import com.salesway.teams.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
    Optional<Team> findByIdAndCompanyId(UUID id, UUID companyId);
}
