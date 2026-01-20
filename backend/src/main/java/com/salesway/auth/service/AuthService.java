package com.salesway.auth.service;

import com.salesway.auth.dto.LoginRequest;
import com.salesway.auth.dto.LoginResponse;
import com.salesway.auth.dto.SignupRequest;
import com.salesway.auth.dto.SignupResponse;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.notifications.service.NotificationService;
import com.salesway.security.CustomUserDetails;
import com.salesway.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;

@Service
public class AuthService {
    private static final Logger LOG = LoggerFactory.getLogger(AuthService.class);
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CompanyRepository companyRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final ManagerAccessService managerAccessService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService,
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService,
            ManagerAccessService managerAccessService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.managerAccessService = managerAccessService;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        ensureMembership(user);
        notifyLogin(user);

        String token = jwtService.generateToken(
                user.getEmail(),
                Map.of("userId", user.getId().toString())
        );

        return new LoginResponse(token, user.getId(), user.getEmail(), user.getLastLoginAt());
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        validateSignup(request, normalizedEmail);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        CompanyMembership managerMembership = managerAccessService.getManagerMembership();
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(Instant.now());
        user.setLastLoginAt(Instant.now());
        user = userRepository.save(user);
        createMembershipForManager(user, managerMembership, request.getRole());

        String token = jwtService.generateToken(
                user.getEmail(),
                Map.of("userId", user.getId().toString())
        );

        return new SignupResponse(token, user.getId(), user.getEmail(), user.getLastLoginAt());
    }

    private void validateSignup(SignupRequest request, String normalizedEmail) {
        String password = request.getPassword();
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (!password.equals(request.getRetypePassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        String emailLocalPart = normalizedEmail.split("@", 2)[0];
        if (!emailLocalPart.isBlank()
                && password.toLowerCase().contains(emailLocalPart.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too easy to guess");
        }

        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include letters and numbers");
        }
    }

    private void ensureMembership(User user) {
        if (companyMembershipRepository.findFirstByUserId(user.getId()).isPresent()) {
            return;
        }

        CompanyMembership managerMembership = companyMembershipRepository
                .findFirstByRoleInAndStatus(
                        java.util.EnumSet.of(MembershipRole.MANAGER, MembershipRole.ADMIN),
                        MembershipStatus.ACTIVE
                )
                .orElse(null);

        Company company;
        if (managerMembership != null) {
            company = managerMembership.getCompany();
        } else {
            company = new Company();
            company.setName("Personal Workspace - " + user.getEmail());
            company.setTimezone("UTC");
            company = companyRepository.save(company);
        }

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setUser(user);
        membership.setRole(MembershipRole.AGENT);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setManagerMembership(managerMembership);
        companyMembershipRepository.save(membership);
    }

    private void createMembershipForManager(
            User user,
            CompanyMembership managerMembership,
            MembershipRole membershipRole
    ) {
        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(managerMembership.getCompany());
        membership.setUser(user);
        MembershipRole resolvedRole = membershipRole == null ? MembershipRole.AGENT : membershipRole;
        membership.setRole(resolvedRole);
        membership.setStatus(MembershipStatus.ACTIVE);
        if (resolvedRole == MembershipRole.AGENT) {
            membership.setManagerMembership(managerMembership);
        }
        companyMembershipRepository.save(membership);
    }

    private void notifyLogin(User user) {
        companyMembershipRepository.findFirstByUserId(user.getId())
                .filter(membership -> membership.getManagerMembership() != null)
                .ifPresent(membership -> {
                    try {
                        notificationService.createNotification(
                                membership.getCompany(),
                                membership.getManagerMembership(),
                                com.salesway.common.enums.NotificationType.USER_LOGIN,
                                Map.of(
                                        "agent_membership_id", membership.getId().toString(),
                                        "agent_email", membership.getUser().getEmail(),
                                        "message", "Utilizatorul " + membership.getUser().getEmail()
                                                + " s-a conectat cu succes."
                                ),
                                Instant.now()
                        );
                    } catch (RuntimeException ex) {
                        LOG.warn("Failed to create login notification for user {}", user.getId(), ex);
                    }
                });
    }
}
