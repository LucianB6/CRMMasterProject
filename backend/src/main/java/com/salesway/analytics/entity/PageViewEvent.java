package com.salesway.analytics.entity;

import com.salesway.auth.entity.User;
import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "page_view_events", indexes = {
        @Index(name = "idx_page_view_events_company_created_at", columnList = "company_id,created_at"),
        @Index(name = "idx_page_view_events_user_created_at", columnList = "user_id,created_at"),
        @Index(name = "idx_page_view_events_path_created_at", columnList = "path,created_at")
})
public class PageViewEvent extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Size(max = 255)
    @Column(name = "path", nullable = false)
    private String path;

    @Size(max = 255)
    @Column(name = "route_name")
    private String routeName;

    @Size(max = 64)
    @Column(name = "source")
    private String source;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

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

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getRouteName() {
        return routeName;
    }

    public void setRouteName(String routeName) {
        this.routeName = routeName;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
}
