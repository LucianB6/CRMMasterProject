package com.salesway.auth.controller;

import com.salesway.auth.dto.LoginRequest;
import com.salesway.auth.dto.LoginResponse;
import com.salesway.auth.dto.CurrentUserResponse;
import com.salesway.auth.dto.GoogleLoginRequest;
import com.salesway.auth.dto.SignupRequest;
import com.salesway.auth.dto.SignupResponse;
import com.salesway.auth.dto.UpdateProfileRequest;
import com.salesway.auth.service.AuthService;
import com.salesway.security.CustomUserDetails;
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
