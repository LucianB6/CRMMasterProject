package com.salesway.notifications.service;

import com.salesway.common.enums.DailyReportStatus;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.common.enums.NotificationType;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.notifications.repository.NotificationRepository;
import com.salesway.reports.entity.DailyReport;
import com.salesway.reports.repository.DailyReportRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

@Component
public class ReportNotificationScheduler {
    private final CompanyMembershipRepository companyMembershipRepository;
    private final DailyReportRepository dailyReportRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final LocalTime reportDeadlineTime;
    private final int reminderMinutes;

    public ReportNotificationScheduler(
            CompanyMembershipRepository companyMembershipRepository,
            DailyReportRepository dailyReportRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            @Value("${app.notifications.report-deadline-time:18:00}") String reportDeadlineTime,
            @Value("${app.notifications.report-reminder-minutes:30}") int reminderMinutes
    ) {
        this.companyMembershipRepository = companyMembershipRepository;
        this.dailyReportRepository = dailyReportRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.reportDeadlineTime = LocalTime.parse(reportDeadlineTime);
        this.reminderMinutes = reminderMinutes;
    }

    @Scheduled(cron = "0 */5 * * * *")
    public void sendReportReminders() {
        List<CompanyMembership> agents = companyMembershipRepository.findByRoleAndStatusInAndManagerMembershipIsNotNull(
                MembershipRole.AGENT,
                EnumSet.of(MembershipStatus.ACTIVE)
        );

        for (CompanyMembership agent : agents) {
            CompanyMembership manager = agent.getManagerMembership();
            if (manager == null) {
                continue;
            }

            ZoneId zoneId = resolveZone(agent.getCompany().getTimezone());
            ZonedDateTime now = ZonedDateTime.now(zoneId);
            LocalDate today = now.toLocalDate();
            ZonedDateTime deadline = ZonedDateTime.of(today, reportDeadlineTime, zoneId);
            ZonedDateTime reminderAt = deadline.minusMinutes(reminderMinutes);

            DailyReport report = dailyReportRepository
                    .findByAgentMembershipIdAndReportDate(agent.getId(), today)
                    .orElse(null);

            if (report != null && report.getStatus() != DailyReportStatus.DRAFT) {
                continue;
            }

            if (!now.isAfter(reminderAt) || now.isAfter(deadline)) {
                continue;
            }

            if (hasNotification(manager, NotificationType.REPORT_DUE_30_MIN, zoneId, today)) {
                continue;
            }

            notificationService.createNotification(
                    agent.getCompany(),
                    manager,
                    NotificationType.REPORT_DUE_30_MIN,
                    Map.of(
                            "agent_membership_id", agent.getId().toString(),
                            "agent_email", agent.getUser().getEmail(),
                            "report_date", today.toString(),
                            "message", "Utilizatorul " + agent.getUser().getEmail() + " mai are "
                                    + reminderMinutes + " minute si nu a dat submit."
                    ),
                    Instant.now()
            );
        }
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void sendMissingReportNotifications() {
        List<CompanyMembership> agents = companyMembershipRepository.findByRoleAndStatusInAndManagerMembershipIsNotNull(
                MembershipRole.AGENT,
                EnumSet.of(MembershipStatus.ACTIVE)
        );

        for (CompanyMembership agent : agents) {
            CompanyMembership manager = agent.getManagerMembership();
            if (manager == null) {
                continue;
            }

            ZoneId zoneId = resolveZone(agent.getCompany().getTimezone());
            ZonedDateTime now = ZonedDateTime.now(zoneId);
            LocalDate today = now.toLocalDate();
            ZonedDateTime deadline = ZonedDateTime.of(today, reportDeadlineTime, zoneId);

            if (now.isBefore(deadline)) {
                continue;
            }

            DailyReport report = dailyReportRepository
                    .findByAgentMembershipIdAndReportDate(agent.getId(), today)
                    .orElse(null);
            if (report != null && report.getStatus() != DailyReportStatus.DRAFT) {
                continue;
            }

            if (hasNotification(manager, NotificationType.REPORT_NOT_SUBMITTED, zoneId, today)) {
                continue;
            }

            notificationService.createNotification(
                    agent.getCompany(),
                    manager,
                    NotificationType.REPORT_NOT_SUBMITTED,
                    Map.of(
                            "agent_membership_id", agent.getId().toString(),
                            "agent_email", agent.getUser().getEmail(),
                            "report_date", today.toString(),
                            "message", "Utilizatorul " + agent.getUser().getEmail() + " nu a dat submit."
                    ),
                    Instant.now()
            );
        }
    }

    private boolean hasNotification(CompanyMembership manager, NotificationType type, ZoneId zoneId, LocalDate date) {
        ZonedDateTime startOfDay = date.atStartOfDay(zoneId);
        ZonedDateTime endOfDay = date.atTime(LocalTime.MAX).atZone(zoneId);
        return notificationRepository.existsByRecipientMembershipIdAndTypeAndScheduledForBetween(
                manager.getId(),
                type,
                startOfDay.toInstant(),
                endOfDay.toInstant()
        );
    }

    private ZoneId resolveZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception ex) {
            return ZoneId.of("UTC");
        }
    }
}
