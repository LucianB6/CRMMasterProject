package com.salesway.auth.controller;

import com.salesway.auth.dto.LoginRequest;
import com.salesway.auth.dto.LoginResponse;
import com.salesway.auth.dto.CurrentUserResponse;
import com.salesway.auth.dto.AuthMessageResponse;
import com.salesway.auth.dto.ForgotPasswordRequest;
import com.salesway.auth.dto.GoogleLoginRequest;
import com.salesway.auth.dto.ResetPasswordRequest;
import com.salesway.auth.dto.SignupRequest;
import com.salesway.auth.dto.SignupResponse;
import com.salesway.auth.dto.UpdateProfileRequest;
import com.salesway.auth.service.AuthService;
import com.salesway.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<LoginResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthMessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        authService.requestPasswordReset(request, resolveClientIp(httpServletRequest));
        return ResponseEntity.ok(new AuthMessageResponse(
                "Dacă adresa există în sistem, am trimis instrucțiunile pentru resetarea parolei."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            int separatorIndex = forwardedFor.indexOf(',');
            return separatorIndex >= 0 ? forwardedFor.substring(0, separatorIndex).trim() : forwardedFor.trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        return ResponseEntity.ok(new CurrentUserResponse(
                userDetails.getUser().getId(),
                userDetails.getUser().getEmail(),
                userDetails.getUser().getFirstName(),
                userDetails.getUser().getLastName()
        ));
    }

    @PatchMapping("/me")
    public ResponseEntity<CurrentUserResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        var updatedUser = authService.updateProfile(userDetails, request);
        return ResponseEntity.ok(new CurrentUserResponse(
                updatedUser.getId(),
                updatedUser.getEmail(),
                updatedUser.getFirstName(),
                updatedUser.getLastName()
        ));
    }
}
