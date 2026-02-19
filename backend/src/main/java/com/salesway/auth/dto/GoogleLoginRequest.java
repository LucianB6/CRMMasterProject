package com.salesway.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GoogleLoginRequest {
    @NotBlank
    private String idToken;

    @Size(max = 255)
    private String inviteToken;

    private GoogleSignupIntent signupIntent;

    @Size(max = 64)
    private String planCode;

    @Size(max = 255)
    private String companyName;

    public String getIdToken() {
        return idToken;
    }

    public void setIdToken(String idToken) {
        this.idToken = idToken;
    }

    public String getInviteToken() {
        return inviteToken;
    }

    public void setInviteToken(String inviteToken) {
        this.inviteToken = inviteToken;
    }

    public GoogleSignupIntent getSignupIntent() {
        return signupIntent;
    }

    public void setSignupIntent(GoogleSignupIntent signupIntent) {
        this.signupIntent = signupIntent;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
}
