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

import java.time.Instant;
import java.util.Map;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CompanyRepository companyRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService,
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
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

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(Instant.now());
        user.setLastLoginAt(Instant.now());
        user = userRepository.save(user);
        ensureMembership(user);

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

        Company company = new Company();
        company.setName("Personal Workspace - " + user.getEmail());
        company.setTimezone("UTC");
        Company savedCompany = companyRepository.save(company);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(savedCompany);
        membership.setUser(user);
        membership.setRole(MembershipRole.AGENT);
        membership.setStatus(MembershipStatus.ACTIVE);
        companyMembershipRepository.save(membership);
    }

    private void notifyLogin(User user) {
        companyMembershipRepository.findFirstByUserId(user.getId())
                .filter(membership -> membership.getManagerMembership() != null)
                .ifPresent(membership -> notificationService.createNotification(
                        membership.getCompany(),
                        membership.getManagerMembership(),
                        com.salesway.common.enums.NotificationType.USER_LOGIN,
                        Map.of(
                                "agent_membership_id", membership.getId().toString(),
                                "agent_email", membership.getUser().getEmail(),
                                "message", "Utilizatorul " + membership.getUser().getEmail() + " s-a conectat cu succes."
                        ),
                        Instant.now()
                ));
    }
}
