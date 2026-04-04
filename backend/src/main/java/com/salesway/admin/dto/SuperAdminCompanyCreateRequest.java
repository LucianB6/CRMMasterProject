package com.salesway.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SuperAdminCompanyCreateRequest {
    @NotBlank
    @Size(max = 255)
    private String companyName;

    @Size(max = 64)
    private String planCode;

    @Size(max = 64)
    private String timezone;

    @Email
    @NotBlank
    @Size(max = 255)
    private String managerEmail;

    @NotBlank
    @Size(max = 255)
    private String managerFirstName;

    @NotBlank
    @Size(max = 255)
    private String managerLastName;

    @Size(min = 8, max = 255)
    private String temporaryPassword;

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getManagerEmail() {
        return managerEmail;
    }

    public void setManagerEmail(String managerEmail) {
        this.managerEmail = managerEmail;
    }

    public String getManagerFirstName() {
        return managerFirstName;
    }

    public void setManagerFirstName(String managerFirstName) {
        this.managerFirstName = managerFirstName;
    }

    public String getManagerLastName() {
        return managerLastName;
    }

    public void setManagerLastName(String managerLastName) {
        this.managerLastName = managerLastName;
    }

    public String getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(String temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }
}
