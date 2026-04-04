package com.salesway.admin.service;

import com.salesway.auth.entity.User;
import com.salesway.auth.enums.PlatformRole;
import com.salesway.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SuperAdminAccessService {
    public User getSuperAdminUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        User user = userDetails.getUser();
        if (user.getPlatformRole() != PlatformRole.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Super admin access required");
        }
        return user;
    }
}
