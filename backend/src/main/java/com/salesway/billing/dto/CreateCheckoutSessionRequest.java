package com.salesway.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateCheckoutSessionRequest {
    @NotBlank(message = "lookup_key is required")
    @Pattern(
            regexp = "^[A-Za-z0-9._:-]+$",
            message = "lookup_key contains invalid characters"
    )
    private String lookupKey;

    private String email;

    private String password;

    private String retypePassword;

    private String firstName;

    private String lastName;

    private String companyName;

    @JsonProperty("lookup_key")
    public String getLookupKey() {
        return lookupKey;
    }

    @JsonProperty("lookup_key")
    public void setLookupKey(String lookupKey) {
        this.lookupKey = lookupKey;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @JsonProperty("retype_password")
    public String getRetypePassword() {
        return retypePassword;
    }

    @JsonProperty("retype_password")
    public void setRetypePassword(String retypePassword) {
        this.retypePassword = retypePassword;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    @JsonProperty("company_name")
    public String getCompanyName() {
        return companyName;
    }

    @JsonProperty("company_name")
    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
}
