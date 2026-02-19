package com.salesway.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Component
public class GoogleIdTokenVerifier {
    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String ISSUER_1 = "https://accounts.google.com";
    private static final String ISSUER_2 = "accounts.google.com";

    private final JwtDecoder jwtDecoder;

    public GoogleIdTokenVerifier(@Value("${app.auth.google.client-id}") String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
        OAuth2TokenValidator<Jwt> withIssuerAndExpiration = JwtValidators.createDefaultWithIssuer(ISSUER_1);
        OAuth2TokenValidator<Jwt> audienceValidator = new AudienceValidator(clientId);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuerAndExpiration, audienceValidator));
        this.jwtDecoder = decoder;
    }

    public GoogleTokenClaims verify(String idToken) {
        Jwt jwt;
        try {
            jwt = jwtDecoder.decode(idToken);
        } catch (JwtException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }

        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : null;
        if (!ISSUER_1.equals(issuer) && !ISSUER_2.equals(issuer)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token issuer");
        }

        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        Boolean emailVerified = jwt.getClaim("email_verified");
        String name = jwt.getClaimAsString("name");
        String picture = jwt.getClaimAsString("picture");

        if (!StringUtils.hasText(sub) || !StringUtils.hasText(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token claims");
        }

        return new GoogleTokenClaims(sub, email, Boolean.TRUE.equals(emailVerified), name, picture);
    }

    public record GoogleTokenClaims(String sub, String email, boolean emailVerified, String name, String picture) {
    }

    private static final class AudienceValidator implements OAuth2TokenValidator<Jwt> {
        private final String requiredAudience;

        private AudienceValidator(String requiredAudience) {
            this.requiredAudience = requiredAudience;
        }

        @Override
        public OAuth2TokenValidatorResult validate(Jwt token) {
            List<String> audience = token.getAudience();
            if (audience != null && audience.contains(requiredAudience)) {
                return OAuth2TokenValidatorResult.success();
            }
            OAuth2Error error = new OAuth2Error("invalid_token", "The required audience is missing", null);
            return OAuth2TokenValidatorResult.failure(error);
        }
    }
}
