package com.salesway.admin.service;

import com.salesway.admin.dto.SuperAdminCompanyCreateRequest;
import com.salesway.admin.dto.SuperAdminCompanyCreateResponse;
import com.salesway.admin.dto.SuperAdminCompanyListItemResponse;
import com.salesway.admin.dto.SuperAdminCompanyStatusUpdateResponse;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class SuperAdminCompanyService {
    private final CompanyRepository companyRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SuperAdminAccessService superAdminAccessService;

    public SuperAdminCompanyService(
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository,
            LeadRepository leadRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SuperAdminAccessService superAdminAccessService
    ) {
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.leadRepository = leadRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.superAdminAccessService = superAdminAccessService;
    }

    @Transactional(readOnly = true)
    public List<SuperAdminCompanyListItemResponse> listCompanies() {
        superAdminAccessService.getSuperAdminUser();
        return companyRepository.findAll().stream()
                .sorted(Comparator.comparing(Company::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SuperAdminCompanyCreateResponse createCompany(SuperAdminCompanyCreateRequest request) {
        superAdminAccessService.getSuperAdminUser();

        String normalizedEmail = request.getManagerEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        boolean usedExistingUser = user != null;

        if (usedExistingUser) {
            if (companyMembershipRepository.findFirstByUserIdAndStatusIn(
                    user.getId(),
                    List.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
            ).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "User already has company access");
            }
        } else {
            String temporaryPassword = request.getTemporaryPassword();
            if (temporaryPassword == null || temporaryPassword.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "temporaryPassword is required for a new manager");
            }
            validatePassword(temporaryPassword, normalizedEmail);
            user = new User();
            user.setEmail(normalizedEmail);
            user.setFirstName(request.getManagerFirstName().trim());
            user.setLastName(request.getManagerLastName().trim());
            user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
            user.setPasswordUpdatedAt(Instant.now());
            user = userRepository.save(user);
        }

        user.setFirstName(request.getManagerFirstName().trim());
        user.setLastName(request.getManagerLastName().trim());
        user = userRepository.save(user);

        Company company = new Company();
        company.setName(request.getCompanyName().trim());
        company.setPlanCode(hasText(request.getPlanCode()) ? request.getPlanCode().trim() : null);
        company.setTimezone(hasText(request.getTimezone()) ? request.getTimezone().trim() : "UTC");
        company.setIsActive(true);
        company = companyRepository.save(company);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setUser(user);
        membership.setRole(MembershipRole.MANAGER);
        membership.setStatus(MembershipStatus.ACTIVE);
        companyMembershipRepository.save(membership);

        return new SuperAdminCompanyCreateResponse(
                company.getId(),
                user.getId(),
                user.getEmail(),
                usedExistingUser
        );
    }

    @Transactional
    public SuperAdminCompanyStatusUpdateResponse updateCompanyStatus(UUID companyId, boolean active) {
        superAdminAccessService.getSuperAdminUser();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        company.setIsActive(active);
        companyRepository.save(company);
        return new SuperAdminCompanyStatusUpdateResponse(company.getId(), Boolean.TRUE.equals(company.getIsActive()));
    }

    private SuperAdminCompanyListItemResponse toResponse(Company company) {
        UUID companyId = company.getId();
        long userCount = companyMembershipRepository.countByCompanyIdAndStatusIn(
                companyId,
                List.of(MembershipStatus.ACTIVE)
        );
        long managerCount = companyMembershipRepository.countByCompanyIdAndRoleInAndStatusIn(
                companyId,
                List.of(MembershipRole.MANAGER, MembershipRole.ADMIN),
                List.of(MembershipStatus.ACTIVE)
        );
        long leadCount = leadRepository.countByCompanyId(companyId);
        Instant lastActivityAt = leadRepository.findMaxLastActivityAtByCompanyId(companyId);
        return new SuperAdminCompanyListItemResponse(
                companyId,
                company.getName(),
                company.getPlanCode(),
                Boolean.TRUE.equals(company.getIsActive()),
                company.getCreatedAt(),
                userCount,
                leadCount,
                lastActivityAt,
                managerCount
        );
    }

    private void validatePassword(String password, String normalizedEmail) {
        String trimmedPassword = password.trim();
        String emailLocalPart = normalizedEmail.split("@", 2)[0];
        if (!emailLocalPart.isBlank() && trimmedPassword.toLowerCase(Locale.ROOT).contains(emailLocalPart.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "temporaryPassword is too easy to guess");
        }
        boolean hasLetter = trimmedPassword.chars().anyMatch(Character::isLetter);
        boolean hasDigit = trimmedPassword.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "temporaryPassword must include letters and numbers");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
