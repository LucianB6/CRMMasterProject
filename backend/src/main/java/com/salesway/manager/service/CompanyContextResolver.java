package com.salesway.manager.service;

import com.salesway.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class CompanyContextResolver {
    private static final String COMPANY_HEADER = "X-Company-Id";

    private final JwtService jwtService;

    public CompanyContextResolver(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public Optional<UUID> resolveCompanyId() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return Optional.empty();
        }

        String headerCompanyId = request.getHeader(COMPANY_HEADER);
        if (headerCompanyId != null && !headerCompanyId.isBlank()) {
            return Optional.of(parseUuid(headerCompanyId.trim(), "Invalid X-Company-Id header"));
        }

        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseClaims(token);
            Object companyIdClaim = claims.get("companyId");
            if (companyIdClaim == null) {
                return Optional.empty();
            }
            return Optional.of(parseUuid(companyIdClaim.toString(), "Invalid companyId claim in JWT"));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private HttpServletRequest currentRequest() {
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return servletRequestAttributes.getRequest();
        }
        return null;
    }

    private UUID parseUuid(String raw, String message) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
    }
}
