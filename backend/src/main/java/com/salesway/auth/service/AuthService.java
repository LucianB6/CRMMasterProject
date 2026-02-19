package com.salesway.auth.service;

import com.salesway.auth.dto.GoogleLoginRequest;
import com.salesway.auth.dto.GoogleSignupIntent;
import com.salesway.auth.dto.LoginRequest;
import com.salesway.auth.dto.LoginResponse;
import com.salesway.auth.dto.SignupRequest;
import com.salesway.auth.dto.SignupResponse;
import com.salesway.auth.dto.UpdateProfileRequest;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.notifications.service.NotificationService;
import com.salesway.security.CustomUserDetails;
import com.salesway.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

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
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final InvitationRepository invitationRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            JwtService jwtService,
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService,
            ManagerAccessService managerAccessService,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            InvitationRepository invitationRepository
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
        this.managerAccessService = managerAccessService;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.invitationRepository = invitationRepository;
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
        CompanyMembership membership = getPreferredActiveMembership(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No company access"));
        notifyLogin(user);

        String token = jwtService.generateToken(
                user.getEmail(),
                buildJwtClaims(user, membership)
        );

        return new LoginResponse(token, user.getId(), user.getEmail(), user.getLastLoginAt());
    }

    @Transactional
    public LoginResponse googleLogin(GoogleLoginRequest request) {
        validateGoogleLoginRequest(request);

        GoogleIdTokenVerifier.GoogleTokenClaims claims = googleIdTokenVerifier.verify(request.getIdToken());
        if (!claims.emailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Google email is not verified");
        }

        User user = resolveOrCreateGoogleUser(claims);
        CompanyMembership membership;

        if (hasText(request.getInviteToken())) {
            membership = acceptAgentInvitation(user, claims.email(), request.getInviteToken().trim());
        } else if (request.getSignupIntent() == GoogleSignupIntent.MANAGER) {
            membership = createManagerWorkspace(user, request.getCompanyName(), request.getPlanCode());
        } else {
            membership = getPreferredActiveMembership(user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "not invited / no company access"));
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String token = jwtService.generateToken(
                user.getEmail(),
                buildJwtClaims(user, membership)
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

        CompanyMembership creatorMembership = managerAccessService.getManagerMembership();
        CreationContext creationContext = resolveCreationContext(request, creatorMembership);
        User user = new User();
        user.setEmail(normalizedEmail);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(Instant.now());
        user = userRepository.save(user);
        createMembership(user, creationContext);

        return new SignupResponse(user.getId(), user.getEmail());
    }

    @Transactional
    public User updateProfile(CustomUserDetails userDetails, UpdateProfileRequest request) {
        User user = userDetails.getUser();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        return userRepository.save(user);
    }

    private void validateGoogleLoginRequest(GoogleLoginRequest request) {
        boolean hasInvite = hasText(request.getInviteToken());
        boolean hasManagerSignup = request.getSignupIntent() == GoogleSignupIntent.MANAGER;

        if (hasInvite && hasManagerSignup) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide either inviteToken or signupIntent");
        }

        if (hasManagerSignup) {
            if (!hasText(request.getCompanyName()) || !hasText(request.getPlanCode())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "companyName and planCode are required for MANAGER signup");
            }
        } else if (hasText(request.getCompanyName()) || hasText(request.getPlanCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "companyName/planCode allowed only with signupIntent=MANAGER");
        }
    }

    private User resolveOrCreateGoogleUser(GoogleIdTokenVerifier.GoogleTokenClaims claims) {
        String normalizedEmail = claims.email().trim().toLowerCase();

        User user = userRepository.findByGoogleSub(claims.sub()).orElse(null);
        if (user != null) {
            if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
                userRepository.findByEmailIgnoreCase(normalizedEmail)
                        .filter(other -> !other.getId().equals(user.getId()))
                        .ifPresent(other -> {
                            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already linked to another account");
                        });
                user.setEmail(normalizedEmail);
            }
            enrichUserWithGoogleData(user, claims);
            return user;
        }

        User byEmail = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (byEmail != null) {
            if (byEmail.getGoogleSub() == null) {
                byEmail.setGoogleSub(claims.sub());
                enrichUserWithGoogleData(byEmail, claims);
                return byEmail;
            }

            if (!byEmail.getGoogleSub().equals(claims.sub())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Google account conflict for this email");
            }

            enrichUserWithGoogleData(byEmail, claims);
            return byEmail;
        }

        User newUser = new User();
        newUser.setEmail(normalizedEmail);
        newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setPasswordUpdatedAt(Instant.now());
        newUser.setGoogleSub(claims.sub());
        enrichUserWithGoogleData(newUser, claims);
        return userRepository.save(newUser);
    }

    private void enrichUserWithGoogleData(User user, GoogleIdTokenVerifier.GoogleTokenClaims claims) {
        user.setGoogleSub(claims.sub());
        user.setEmailVerified(claims.emailVerified());
        if (hasText(claims.name())) {
            user.setDisplayName(claims.name().trim());
            if (!hasText(user.getFirstName())) {
                user.setFirstName(claims.name().trim());
            }
        }
        if (hasText(claims.picture())) {
            user.setPictureUrl(claims.picture().trim());
        }
    }

    private CompanyMembership createManagerWorkspace(User user, String companyName, String planCode) {
        if (getPreferredActiveMembership(user).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already has company access");
        }

        Company company = new Company();
        company.setName(companyName.trim());
        company.setPlanCode(planCode.trim());
        company.setTimezone("UTC");
        company = companyRepository.save(company);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setUser(user);
        membership.setRole(MembershipRole.MANAGER);
        membership.setStatus(MembershipStatus.ACTIVE);
        return companyMembershipRepository.save(membership);
    }

    private CompanyMembership acceptAgentInvitation(User user, String googleEmail, String inviteToken) {
        Invitation invitation = invitationRepository.findByToken(inviteToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid invite token"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invitation is no longer usable");
        }

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invitation expired");
        }

        if (!invitation.getInvitedEmail().equalsIgnoreCase(googleEmail.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invitation email mismatch");
        }

        CompanyMembership membership = companyMembershipRepository
                .findByCompanyIdAndUserId(invitation.getCompany().getId(), user.getId())
                .orElseGet(() -> {
                    CompanyMembership newMembership = new CompanyMembership();
                    newMembership.setCompany(invitation.getCompany());
                    newMembership.setUser(user);
                    newMembership.setRole(MembershipRole.AGENT);
                    newMembership.setStatus(MembershipStatus.ACTIVE);
                    return newMembership;
                });

        membership.setRole(MembershipRole.AGENT);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership = companyMembershipRepository.save(membership);

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(Instant.now());
        invitationRepository.save(invitation);

        return membership;
    }

    private Map<String, Object> buildJwtClaims(User user, CompanyMembership membership) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("companyId", membership.getCompany().getId().toString());
        claims.put("role", membership.getRole().name());
        return claims;
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

    private Optional<CompanyMembership> getPreferredActiveMembership(User user) {
        Optional<CompanyMembership> managerOrAdmin = companyMembershipRepository
                .findFirstByUserIdAndRoleInAndStatusIn(
                        user.getId(),
                        EnumSet.of(MembershipRole.ADMIN, MembershipRole.MANAGER),
                        EnumSet.of(MembershipStatus.ACTIVE)
                );
        if (managerOrAdmin.isPresent()) {
            return managerOrAdmin;
        }

        return companyMembershipRepository.findFirstByUserIdAndStatusIn(
                user.getId(),
                EnumSet.of(MembershipStatus.ACTIVE)
        );
    }

    private CreationContext resolveCreationContext(SignupRequest request, CompanyMembership creatorMembership) {
        MembershipRole requestedRole = request.getRole();
        if (requestedRole == MembershipRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot create ADMIN users");
        }

        if (requestedRole == MembershipRole.MANAGER) {
            if (creatorMembership.getRole() == MembershipRole.MANAGER) {
                if (request.getCompanyId() != null || hasText(request.getCompanyName())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "MANAGER can create manager only in same company"
                    );
                }
                return new CreationContext(creatorMembership.getCompany(), creatorMembership, MembershipRole.MANAGER);
            }

            if (creatorMembership.getRole() != MembershipRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager access required");
            }

            Company targetCompany = resolveCompanyForAdminManagerCreation(request);
            ensureCompanyHasNoManagers(targetCompany.getId());
            return new CreationContext(targetCompany, null, MembershipRole.MANAGER);
        }

        if (request.getCompanyId() != null || hasText(request.getCompanyName())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "companyId/companyName are only allowed when creating MANAGER"
            );
        }

        return new CreationContext(creatorMembership.getCompany(), creatorMembership, MembershipRole.AGENT);
    }

    private Company resolveCompanyForAdminManagerCreation(SignupRequest request) {
        boolean hasCompanyId = request.getCompanyId() != null;
        boolean hasCompanyName = hasText(request.getCompanyName());

        if (hasCompanyId == hasCompanyName) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Provide exactly one of companyId or companyName when creating MANAGER as ADMIN"
            );
        }

        if (hasCompanyId) {
            return companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        }

        Company company = new Company();
        company.setName(request.getCompanyName().trim());
        company.setTimezone("UTC");
        return companyRepository.save(company);
    }

    private void ensureCompanyHasNoManagers(UUID companyId) {
        boolean hasManagers = companyMembershipRepository.existsByCompanyIdAndRoleInAndStatusIn(
                companyId,
                EnumSet.of(MembershipRole.ADMIN, MembershipRole.MANAGER),
                EnumSet.of(MembershipStatus.ACTIVE)
        );
        if (hasManagers) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Company already has an active ADMIN or MANAGER"
            );
        }
    }

    private void createMembership(User user, CreationContext creationContext) {
        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(creationContext.company());
        membership.setUser(user);
        membership.setRole(creationContext.role());
        membership.setStatus(MembershipStatus.ACTIVE);
        if (creationContext.role() == MembershipRole.AGENT) {
            membership.setManagerMembership(creationContext.managerMembership());
        }
        companyMembershipRepository.save(membership);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private record CreationContext(
            Company company,
            CompanyMembership managerMembership,
            MembershipRole role
    ) {
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
