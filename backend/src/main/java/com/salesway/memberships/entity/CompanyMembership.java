package com.salesway.memberships.entity;

import com.salesway.auth.entity.User;
import com.salesway.common.auditing.AuditedEntity;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.teams.entity.Team;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "company_memberships",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_memberships_company_user", columnNames = {"company_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_memberships_company_id", columnList = "company_id"),
                @Index(name = "idx_memberships_user_id", columnList = "user_id"),
                @Index(name = "idx_memberships_team_id", columnList = "team_id"),
                @Index(name = "idx_memberships_manager_membership_id", columnList = "manager_membership_id")
        })
public class CompanyMembership extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private MembershipRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_membership_id")
    private CompanyMembership managerMembership;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public MembershipRole getRole() {
        return role;
    }

    public void setRole(MembershipRole role) {
        this.role = role;
    }

    public Team getTeam() {
        return team;
    }

    public void setTeam(Team team) {
        this.team = team;
    }

    public CompanyMembership getManagerMembership() {
        return managerMembership;
    }

    public void setManagerMembership(CompanyMembership managerMembership) {
        this.managerMembership = managerMembership;
    }

    public MembershipStatus getStatus() {
        return status;
    }

    public void setStatus(MembershipStatus status) {
        this.status = status;
    }
}
