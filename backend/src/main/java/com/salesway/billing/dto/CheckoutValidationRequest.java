package com.salesway.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CheckoutValidationRequest {
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

    @JsonProperty("first_name")
    public String getFirstName() {
        return firstName;
    }

    @JsonProperty("first_name")
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    @JsonProperty("last_name")
    public String getLastName() {
        return lastName;
    }

    @JsonProperty("last_name")
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
