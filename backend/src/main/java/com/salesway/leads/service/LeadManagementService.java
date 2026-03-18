package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.leads.dto.LeadAnswerResponse;
import com.salesway.leads.dto.LeadDetailResponse;
import com.salesway.leads.dto.LeadEventResponse;
import com.salesway.leads.dto.LeadListItemResponse;
import com.salesway.leads.dto.LeadNoteRequest;
import com.salesway.leads.dto.LeadSearchCriteria;
import com.salesway.leads.entity.PipelineStage;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.enums.LeadSource;
import com.salesway.leads.enums.LeadStatus;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadSpecifications;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import com.salesway.leads.repository.PipelineStageRepository;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.tasks.dto.TaskBoardResponse;
import com.salesway.tasks.service.TaskBoardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class LeadManagementService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Logger LOG = LoggerFactory.getLogger(LeadManagementService.class);

    private final LeadRepository leadRepository;
    private final LeadStandardFieldsRepository standardFieldsRepository;
    private final LeadAnswerRepository leadAnswerRepository;
    private final CompanyAccessService companyAccessService;
    private final ManagerAccessService managerAccessService;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final TaskBoardService taskBoardService;
    private final LeadEventService leadEventService;
    private final PipelineStageRepository pipelineStageRepository;
    private final ObjectMapper objectMapper;

    public LeadManagementService(
            LeadRepository leadRepository,
            LeadStandardFieldsRepository standardFieldsRepository,
            LeadAnswerRepository leadAnswerRepository,
            CompanyAccessService companyAccessService,
            ManagerAccessService managerAccessService,
            CompanyMembershipRepository companyMembershipRepository,
            TaskBoardService taskBoardService,
            LeadEventService leadEventService,
            PipelineStageRepository pipelineStageRepository,
            ObjectMapper objectMapper
    ) {
        this.leadRepository = leadRepository;
        this.standardFieldsRepository = standardFieldsRepository;
        this.leadAnswerRepository = leadAnswerRepository;
        this.companyAccessService = companyAccessService;
        this.managerAccessService = managerAccessService;
        this.companyMembershipRepository = companyMembershipRepository;
        this.taskBoardService = taskBoardService;
        this.leadEventService = leadEventService;
        this.pipelineStageRepository = pipelineStageRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<LeadListItemResponse> listLeads(
            String status,
            int page,
            int size,
            String q,
            String createdFrom,
            String createdTo,
            String assignedTo,
            Boolean hasOpenTasks,
            String source,
            String sort
    ) {
        validatePaging(page, size);
        String normalizedStatus = LeadStatus.normalize(status);
        String normalizedSource = LeadSource.normalize(source);
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        LOG.debug(
                "Listing leads with company context userId={}, selectedMembershipId={}, selectedCompanyId={}, selectedCompanyName={}",
                membership.getUser().getId(),
                membership.getId(),
                companyId,
                membership.getCompany().getName()
        );

        UUID assignedToUserId = resolveAssignedToFilter(assignedTo, membership);
        Instant createdFromInstant = parseDateParam(createdFrom, true, "createdFrom");
        Instant createdToInstant = parseDateParam(createdTo, false, "createdTo");
        if (createdFromInstant != null && createdToInstant != null && createdFromInstant.isAfter(createdToInstant)) {
            throw new IllegalArgumentException("createdFrom must be <= createdTo");
        }

        LeadSearchCriteria criteria = new LeadSearchCriteria(
                normalizedStatus,
                q,
                createdFromInstant,
                createdToInstant,
                assignedToUserId,
                hasOpenTasks,
                normalizedSource,
                membership.getRole() == MembershipRole.AGENT ? membership.getUser().getId() : null,
                membership.getRole() == MembershipRole.AGENT
        );
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Page<Lead> leads = leadRepository.findAll(LeadSpecifications.byCriteria(companyId, criteria), pageable);

        return leads.map(this::toListResponse);
    }

    @Transactional(readOnly = true)
    public LeadDetailResponse getLead(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, membership);

        LeadStandardFields standard = standardFieldsRepository.findByLeadId(lead.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lead standard fields missing"));
        List<LeadAnswerResponse> answers = leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(lead.getId())
                .stream().map(this::toAnswerResponse).toList();
        List<UUID> relatedLeadIds = lead.getDuplicateGroupId() == null
                ? List.of()
                : leadRepository.findByCompanyIdAndDuplicateGroupId(companyId, lead.getDuplicateGroupId())
                .stream()
                .map(Lead::getId)
                .filter(id -> !id.equals(lead.getId()))
                .toList();

        return new LeadDetailResponse(
                lead.getId(),
                lead.getStatus(),
                lead.getSubmittedAt(),
                lead.getLastActivityAt(),
                standard.getFirstName(),
                standard.getLastName(),
                standard.getEmail(),
                standard.getPhone(),
                lead.getAssignedToUserId(),
                lead.getAssignedAt(),
                lead.getAssignedByUserId(),
                lead.getSource(),
                lead.getCampaign(),
                lead.getAdSet(),
                lead.getAdId(),
                lead.getUtmSource(),
                lead.getUtmCampaign(),
                lead.getUtmMedium(),
                lead.getUtmContent(),
                lead.getLandingPage(),
                lead.getReferrer(),
                lead.getDuplicateGroupId() != null,
                lead.getDuplicateGroupId(),
                lead.getDuplicateOfLeadId(),
                lead.getStage() != null ? lead.getStage().getId() : null,
                relatedLeadIds,
                answers
        );
    }

    @Transactional
    public void updateStatus(UUID leadId, String status) {
        String normalizedStatus = LeadStatus.normalize(status);
        CompanyMembership managerMembership = managerAccessService.getManagerMembership();
        UUID companyId = managerMembership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, companyId);
        String oldStatus = lead.getStatus();
        lead.setStatus(normalizedStatus);
        leadEventService.appendEvent(
                lead,
                LeadEventType.STATUS_CHANGED,
                "Lead status changed",
                Map.of("from", oldStatus, "to", normalizedStatus)
        );
        leadRepository.save(lead);
    }

    @Transactional
    public void updateAssignee(UUID leadId, UUID assignedToUserId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, membership);
        UUID oldAssignee = lead.getAssignedToUserId();

        if (membership.getRole() == MembershipRole.AGENT) {
            if (lead.getAssignedToUserId() != null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Agents can only self-assign unassigned leads");
            }
            if (assignedToUserId == null || !assignedToUserId.equals(membership.getUser().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Agents can only assign leads to themselves");
            }
            lead.setAssignedToUserId(membership.getUser().getId());
            lead.setAssignedByUserId(membership.getUser().getId());
            lead.setAssignedAt(Instant.now());
        } else {
            ensureManagerRole(membership);
            if (assignedToUserId == null) {
                lead.setAssignedToUserId(null);
                lead.setAssignedByUserId(null);
                lead.setAssignedAt(null);
            } else {
                companyMembershipRepository.findByCompanyIdAndUserId(companyId, assignedToUserId)
                        .filter(companyMembership -> companyMembership.getStatus() == MembershipStatus.ACTIVE)
                        .orElseThrow(() -> new IllegalArgumentException("assignedToUserId does not belong to current company"));
                lead.setAssignedToUserId(assignedToUserId);
                lead.setAssignedByUserId(membership.getUser().getId());
                lead.setAssignedAt(Instant.now());
            }
        }

        leadEventService.appendEvent(
                lead,
                LeadEventType.ASSIGNEE_CHANGED,
                "Lead assignee changed",
                assigneeChangedPayload(oldAssignee, assignedToUserId)
        );
        leadRepository.save(lead);
    }

    @Transactional
    public void addNote(UUID leadId, LeadNoteRequest request) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        Lead lead = getLeadOrThrow(leadId, membership);
        String text = request.getText().trim();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("text", text);
        if (request.getCategory() != null) {
            payload.put("category", request.getCategory().name());
        }
        leadEventService.appendEvent(
                lead,
                LeadEventType.NOTE_ADDED,
                "Lead note added",
                payload
        );
        leadRepository.save(lead);
    }

    @Transactional
    public void updateStage(UUID leadId, UUID stageId) {
        CompanyMembership managerMembership = managerAccessService.getManagerMembership();
        UUID companyId = managerMembership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, companyId);
        if (stageId == null) {
            lead.setStage(null);
            leadRepository.save(lead);
            return;
        }
        PipelineStage stage = pipelineStageRepository.findByIdAndCompanyId(stageId, companyId)
                .orElseThrow(() -> new IllegalArgumentException("stageId does not belong to current company"));
        lead.setStage(stage);
        leadRepository.save(lead);
    }

    @Transactional(readOnly = true)
    public Page<LeadEventResponse> getEvents(
            UUID leadId,
            int page,
            int size,
            String types
    ) {
        validatePaging(page, size);
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        getLeadOrThrow(leadId, membership);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Collection<LeadEventType> parsedTypes = parseEventTypes(types);
        return leadEventService.getEvents(companyId, leadId, pageable, parsedTypes);
    }

    @Transactional(readOnly = true)
    public List<TaskBoardResponse> getLeadTasks(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        getLeadOrThrow(leadId, membership);
        return taskBoardService.getTasksForCompany(companyId, leadId, null, null, null, null);
    }

    private Lead getLeadOrThrow(UUID leadId, UUID companyId) {
        return leadRepository.findByIdAndCompanyId(leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
    }

    private Lead getLeadOrThrow(UUID leadId, CompanyMembership membership) {
        Lead lead = getLeadOrThrow(leadId, membership.getCompany().getId());
        if (membership.getRole() == MembershipRole.AGENT) {
            UUID currentUserId = membership.getUser().getId();
            UUID assignedToUserId = lead.getAssignedToUserId();
            if (assignedToUserId != null && !assignedToUserId.equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found");
            }
        }
        return lead;
    }

    private LeadListItemResponse toListResponse(Lead lead) {
        LeadStandardFields standard = lead.getStandardFields();
        if (standard == null) {
            standard = standardFieldsRepository.findByLeadId(lead.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lead standard fields missing"));
        }
        return new LeadListItemResponse(
                lead.getId(),
                lead.getStatus(),
                lead.getSubmittedAt(),
                standard.getFirstName(),
                standard.getLastName(),
                standard.getEmail(),
                standard.getPhone(),
                lead.getAssignedToUserId(),
                lead.getLastActivityAt(),
                lead.getSource(),
                lead.getDuplicateGroupId() != null,
                lead.getDuplicateGroupId()
        );
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Invalid page: must be >= 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid size: must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private LeadAnswerResponse toAnswerResponse(LeadAnswer answer) {
        return new LeadAnswerResponse(
                answer.getQuestion() != null ? answer.getQuestion().getId() : null,
                answer.getQuestionLabelSnapshot(),
                answer.getQuestionTypeSnapshot(),
                answer.getRequiredSnapshot(),
                toJsonString(answer.getOptionsSnapshot()),
                toJsonString(answer.getAnswerValue()),
                answer.getOptionsSnapshot(),
                answer.getAnswerValue()
        );
    }

    private String toJsonString(JsonNode node) {
        if (node == null) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize lead answer", exception);
        }
    }

    private UUID resolveAssignedToFilter(String assignedTo, CompanyMembership managerMembership) {
        if (assignedTo == null || assignedTo.isBlank()) {
            return null;
        }
        String normalized = assignedTo.trim();
        if ("me".equalsIgnoreCase(normalized)) {
            return managerMembership.getUser().getId();
        }
        UUID assignee;
        try {
            assignee = UUID.fromString(normalized);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("assignedTo must be UUID or 'me'");
        }
        if (managerMembership.getRole() == MembershipRole.AGENT
                && !assignee.equals(managerMembership.getUser().getId())) {
            throw new IllegalArgumentException("Agents can only filter by their own assignments");
        }
        companyMembershipRepository.findByCompanyIdAndUserId(managerMembership.getCompany().getId(), assignee)
                .orElseThrow(() -> new IllegalArgumentException("assignedTo user not found in current company"));
        return assignee;
    }

    private Sort parseSort(String rawSort) {
        if (rawSort == null || rawSort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "submittedAt");
        }
        String[] chunks = rawSort.split(",");
        if (chunks.length != 2) {
            throw new IllegalArgumentException("Invalid sort format. Expected: field,asc|desc");
        }
        String field = chunks[0].trim();
        String directionRaw = chunks[1].trim().toLowerCase(Locale.ROOT);
        String mappedField = switch (field) {
            case "submittedAt" -> "submittedAt";
            case "lastActivityAt" -> "lastActivityAt";
            default -> throw new IllegalArgumentException("Invalid sort field. Allowed: submittedAt, lastActivityAt");
        };
        Sort.Direction direction = switch (directionRaw) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new IllegalArgumentException("Invalid sort direction. Allowed: asc, desc");
        };
        return Sort.by(direction, mappedField).and(Sort.by(Sort.Direction.DESC, "submittedAt"));
    }

    private Instant parseDateParam(String raw, boolean startOfDay, String parameter) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        try {
            if (!normalized.contains("T")) {
                LocalDate localDate = LocalDate.parse(normalized);
                return startOfDay
                        ? localDate.atStartOfDay().toInstant(ZoneOffset.UTC)
                        : localDate.plusDays(1).atStartOfDay().minusNanos(1).toInstant(ZoneOffset.UTC);
            }
            return OffsetDateTime.parse(normalized).toInstant();
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Invalid " + parameter + " format. Use ISO date or datetime");
        }
    }

    private Collection<LeadEventType> parseEventTypes(String rawTypes) {
        if (rawTypes == null || rawTypes.isBlank()) {
            return List.of();
        }
        return Arrays.stream(rawTypes.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> {
                    try {
                        return LeadEventType.valueOf(value.toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException exception) {
                        throw new IllegalArgumentException("Invalid event type: " + value);
                    }
                })
                .toList();
    }

    private void ensureManagerRole(CompanyMembership membership) {
        if (!EnumSet.of(MembershipRole.MANAGER, MembershipRole.ADMIN).contains(membership.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only managers can reassign leads");
        }
    }

    private Map<String, Object> assigneeChangedPayload(UUID from, UUID to) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", from);
        payload.put("to", to);
        return payload;
    }
}
