package com.salesway.manager.service;

import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.manager.dto.ManagerAgentCreateRequest;
import com.salesway.manager.dto.ManagerAgentCreateResponse;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.teams.entity.Team;
import com.salesway.teams.repository.TeamRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class ManagerTeamService {
    private final ManagerAccessService managerAccessService;
    private final UserRepository userRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;

    public ManagerTeamService(
            ManagerAccessService managerAccessService,
            UserRepository userRepository,
            CompanyMembershipRepository companyMembershipRepository,
            TeamRepository teamRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.managerAccessService = managerAccessService;
        this.userRepository = userRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ManagerAgentCreateResponse createAgent(ManagerAgentCreateRequest request) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        validatePassword(request.getPassword(), normalizedEmail);

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(Instant.now());
        User savedUser = userRepository.save(user);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(manager.getCompany());
        membership.setUser(savedUser);
        membership.setRole(MembershipRole.AGENT);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setManagerMembership(manager);

        if (request.getTeamId() != null) {
            Team team = teamRepository.findByIdAndCompanyId(request.getTeamId(), manager.getCompany().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
            membership.setTeam(team);
        }

        CompanyMembership savedMembership = companyMembershipRepository.save(membership);
        return new ManagerAgentCreateResponse(savedMembership.getId(), savedUser.getId(), savedUser.getEmail());
    }

    @Transactional
    public void deleteAgent(UUID userId) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        if (manager.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete your own user");
        }

        CompanyMembership membership = manager.getRole() == MembershipRole.ADMIN
                ? companyMembershipRepository
                .findByCompanyIdAndUserId(manager.getCompany().getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                : companyMembershipRepository
                .findByManagerMembershipIdAndUserId(manager.getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (membership.getRole() != MembershipRole.AGENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not an agent");
        }

        companyMembershipRepository.delete(membership);
        userRepository.delete(membership.getUser());
    }

    private void validatePassword(String password, String normalizedEmail) {
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        String emailLocalPart = normalizedEmail.split("@", 2)[0];
        if (!emailLocalPart.isBlank() && password.toLowerCase().contains(emailLocalPart.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too easy to guess");
        }

        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include letters and numbers");
        }
    }
}
