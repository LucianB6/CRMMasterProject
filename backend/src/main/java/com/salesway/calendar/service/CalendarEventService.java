package com.salesway.calendar.service;

import com.salesway.calendar.dto.CalendarEventRequest;
import com.salesway.calendar.dto.CalendarEventResponse;
import com.salesway.calendar.entity.CalendarEvent;
import com.salesway.calendar.repository.CalendarEventRepository;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

@Service
public class CalendarEventService {
    private final CalendarEventRepository calendarEventRepository;
    private final CompanyMembershipRepository companyMembershipRepository;

    public CalendarEventService(
            CalendarEventRepository calendarEventRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.calendarEventRepository = calendarEventRepository;
        this.companyMembershipRepository = companyMembershipRepository;
    }

    @Transactional(readOnly = true)
    public List<CalendarEventResponse> getEvents(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership membership = getReportingMembership(true);
        return calendarEventRepository
                .findByMembershipIdAndEventDateBetweenOrderByEventDateAscStartTimeAsc(
                        membership.getId(),
                        from,
                        to
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CalendarEventResponse createEvent(CalendarEventRequest request) {
        validateTimeRange(request.getStartTime(), request.getEndTime());
        CompanyMembership membership = getReportingMembership(true);

        CalendarEvent event = new CalendarEvent();
        event.setMembership(membership);
        event.setEventDate(request.getEventDate());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setTitle(request.getTitle());

        CalendarEvent saved = calendarEventRepository.save(event);
        return toResponse(saved);
    }

    private CalendarEventResponse toResponse(CalendarEvent event) {
        return new CalendarEventResponse(
                event.getId(),
                event.getEventDate(),
                event.getStartTime(),
                event.getEndTime(),
                event.getTitle()
        );
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing date range");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing time range");
        }
        if (!startTime.isBefore(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid time range");
        }
    }

    private CompanyMembership getReportingMembership(boolean allowInvited) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        EnumSet<MembershipStatus> eligibleStatuses = allowInvited
                ? EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
                : EnumSet.of(MembershipStatus.ACTIVE);

        return companyMembershipRepository
                .findFirstByUserIdAndStatusIn(userDetails.getUser().getId(), eligibleStatuses)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No eligible membership found"));
    }
}
