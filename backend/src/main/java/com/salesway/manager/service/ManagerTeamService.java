package com.salesway.manager.service;

import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.manager.dto.ManagerAgentCreateRequest;
import com.salesway.manager.dto.ManagerAgentCreateResponse;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.calendar.repository.CalendarEventRepository;
import com.salesway.calendar.repository.CalendarIntegrationRepository;
import com.salesway.chatbot.repository.ChatConversationRepository;
import com.salesway.goals.repository.GoalRepository;
import com.salesway.notifications.repository.NotificationRepository;
import com.salesway.reports.repository.DailyReportAuditLogRepository;
import com.salesway.reports.repository.DailyReportInputsRepository;
import com.salesway.reports.repository.DailyReportRepository;
import com.salesway.teams.entity.Team;
import com.salesway.teams.repository.TeamRepository;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import com.salesway.tasks.repository.TaskProgressRepository;
import com.salesway.tasks.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ManagerTeamService {
    private final ManagerAccessService managerAccessService;
    private final UserRepository userRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final CalendarIntegrationRepository calendarIntegrationRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final GoalRepository goalRepository;
    private final NotificationRepository notificationRepository;
    private final DailyReportAuditLogRepository dailyReportAuditLogRepository;
    private final DailyReportInputsRepository dailyReportInputsRepository;
    private final DailyReportRepository dailyReportRepository;
    private final TaskBoardItemRepository taskBoardItemRepository;
    private final TaskProgressRepository taskProgressRepository;
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;

    public ManagerTeamService(
            ManagerAccessService managerAccessService,
            UserRepository userRepository,
            CompanyMembershipRepository companyMembershipRepository,
            CalendarEventRepository calendarEventRepository,
            CalendarIntegrationRepository calendarIntegrationRepository,
            ChatConversationRepository chatConversationRepository,
            GoalRepository goalRepository,
            NotificationRepository notificationRepository,
            DailyReportAuditLogRepository dailyReportAuditLogRepository,
            DailyReportInputsRepository dailyReportInputsRepository,
            DailyReportRepository dailyReportRepository,
            TaskBoardItemRepository taskBoardItemRepository,
            TaskProgressRepository taskProgressRepository,
            TaskRepository taskRepository,
            TeamRepository teamRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.managerAccessService = managerAccessService;
        this.userRepository = userRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.calendarEventRepository = calendarEventRepository;
        this.calendarIntegrationRepository = calendarIntegrationRepository;
        this.chatConversationRepository = chatConversationRepository;
        this.goalRepository = goalRepository;
        this.notificationRepository = notificationRepository;
        this.dailyReportAuditLogRepository = dailyReportAuditLogRepository;
        this.dailyReportInputsRepository = dailyReportInputsRepository;
        this.dailyReportRepository = dailyReportRepository;
        this.taskBoardItemRepository = taskBoardItemRepository;
        this.taskProgressRepository = taskProgressRepository;
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ManagerAgentCreateResponse createAgent(ManagerAgentCreateRequest request) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        validatePassword(request.getPassword(), normalizedEmail);

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(Instant.now());
        User savedUser = userRepository.save(user);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(manager.getCompany());
        membership.setUser(savedUser);
        membership.setRole(MembershipRole.AGENT);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setManagerMembership(manager);

        if (request.getTeamId() != null) {
            Team team = teamRepository.findByIdAndCompanyId(request.getTeamId(), manager.getCompany().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
            membership.setTeam(team);
        }

        CompanyMembership savedMembership = companyMembershipRepository.save(membership);
        return new ManagerAgentCreateResponse(savedMembership.getId(), savedUser.getId(), savedUser.getEmail());
    }

    @Transactional
    public void deleteAgent(UUID userId) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        if (manager.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete your own user");
        }

        CompanyMembership membership = manager.getRole() == MembershipRole.ADMIN
                ? companyMembershipRepository
                .findByCompanyIdAndUserId(manager.getCompany().getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                : companyMembershipRepository
                .findByManagerMembershipIdAndUserId(manager.getId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (membership.getRole() != MembershipRole.AGENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not an agent");
        }

        UUID membershipId = membership.getId();
        dailyReportAuditLogRepository.deleteByActorMembershipId(membershipId);

        List<UUID> reportIds = dailyReportRepository.findByAgentMembershipId(membershipId).stream()
                .map(report -> report.getId())
                .toList();
        if (!reportIds.isEmpty()) {
            taskProgressRepository.deleteByComputedFromReportIdIn(reportIds);
            dailyReportAuditLogRepository.deleteByDailyReportIdIn(reportIds);
            dailyReportInputsRepository.deleteByDailyReportIdIn(reportIds);
            dailyReportRepository.deleteAllByIdInBatch(reportIds);
        }

        List<UUID> taskIds = taskRepository
                .findByCreatedByMembershipIdOrAssignedToMembershipId(membershipId, membershipId)
                .stream()
                .map(task -> task.getId())
                .toList();
        if (!taskIds.isEmpty()) {
            taskProgressRepository.deleteByTaskIdIn(taskIds);
            taskRepository.deleteAllByIdInBatch(taskIds);
        }

        notificationRepository.deleteByRecipientMembershipId(membershipId);
        goalRepository.deleteByMembershipId(membershipId);
        calendarEventRepository.deleteByMembershipId(membershipId);
        calendarIntegrationRepository.deleteByMembershipId(membershipId);
        chatConversationRepository.deleteByMembershipId(membershipId);
        taskBoardItemRepository.deleteByMembershipId(membershipId);

        companyMembershipRepository.delete(membership);
        userRepository.delete(membership.getUser());
    }

    private void validatePassword(String password, String normalizedEmail) {
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        String emailLocalPart = normalizedEmail.split("@", 2)[0];
        if (!emailLocalPart.isBlank() && password.toLowerCase().contains(emailLocalPart.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too easy to guess");
        }

        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include letters and numbers");
        }
    }
}
