package com.salesway.billing.service;

import com.salesway.auth.dto.LoginResponse;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.config.StripeProperties;
import com.salesway.billing.dto.CancelSubscriptionResponse;
import com.salesway.billing.dto.CreateCheckoutSessionRequest;
import com.salesway.billing.dto.ReactivateSubscriptionResponse;
import com.salesway.billing.entity.PendingSignup;
import com.salesway.billing.entity.PendingSignupStatus;
import com.salesway.billing.entity.ProcessedStripeEvent;
import com.salesway.billing.repository.PendingSignupRepository;
import com.salesway.billing.repository.ProcessedStripeEventRepository;
import com.salesway.common.error.FieldValidationException;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.config.AppProperties;
import com.salesway.email.dto.PaymentLinkEmailPayload;
import com.salesway.email.service.EmailService;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.JwtService;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerListParams;
import com.stripe.param.SubscriptionListParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.billingportal.SessionCreateParams;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StripeBillingService {
    private static final Logger log = LoggerFactory.getLogger(StripeBillingService.class);
    private static final String CHECKOUT_COMPLETED = "checkout.session.completed";
    private static final String SUBSCRIPTION_CREATED = "customer.subscription.created";
    private static final String SUBSCRIPTION_UPDATED = "customer.subscription.updated";
    private static final String SUBSCRIPTION_DELETED = "customer.subscription.deleted";
    private static final long STARTER_TRIAL_PERIOD_DAYS = 30L;
    private static final Duration SUBSCRIPTION_CANCELLATION_GRACE = Duration.ofDays(30);
    private static final Duration PAYMENT_LINK_RATE_LIMIT_WINDOW = Duration.ofMinutes(2);
    private static final Duration PENDING_SIGNUP_EXPIRATION = Duration.ofMinutes(30);
    private static final EnumSet<PendingSignupStatus> ACTIVE_PENDING_SIGNUP_STATUSES =
            EnumSet.of(PendingSignupStatus.PENDING, PendingSignupStatus.CHECKOUT_CREATED);

    private final CompanyAccessService companyAccessService;
    private final CompanyRepository companyRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final UserRepository userRepository;
    private final AppProperties appProperties;
    private final StripeProperties stripeProperties;
    private final StripeCatalogService stripeCatalogService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PendingSignupRepository pendingSignupRepository;
    private final ProcessedStripeEventRepository processedStripeEventRepository;
    private final PlanCatalogService planCatalogService;
    private final EmailService emailService;
    private final Map<String, Instant> recentPaymentLinkRequests = new ConcurrentHashMap<>();

    public StripeBillingService(
            CompanyAccessService companyAccessService,
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository,
            UserRepository userRepository,
            AppProperties appProperties,
            StripeProperties stripeProperties,
            StripeCatalogService stripeCatalogService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PendingSignupRepository pendingSignupRepository,
            ProcessedStripeEventRepository processedStripeEventRepository,
            PlanCatalogService planCatalogService,
            EmailService emailService
    ) {
        this.companyAccessService = companyAccessService;
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.userRepository = userRepository;
        this.appProperties = appProperties;
        this.stripeProperties = stripeProperties;
        this.stripeCatalogService = stripeCatalogService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.pendingSignupRepository = pendingSignupRepository;
        this.processedStripeEventRepository = processedStripeEventRepository;
        this.planCatalogService = planCatalogService;
        this.emailService = emailService;
    }

    public URI createCheckoutSession(CreateCheckoutSessionRequest request) {
        PlanCatalogService.CheckoutPlan checkoutPlan = resolveCheckoutPlan(request);
        String lookupKey = checkoutPlan.lookupKey();
        Optional<CheckoutContext> checkoutContext = resolveCheckoutContext();
        Optional<PendingSignup> pendingSignup = checkoutContext.isEmpty()
                ? Optional.of(createPendingSignup(request, lookupKey, null))
                : Optional.empty();

        try {
            boolean applyStarterTrial;
            com.stripe.param.checkout.SessionCreateParams.Builder sessionParamsBuilder = pendingSignup
                    .map(signup -> {
                        try {
                            boolean applyTrial = shouldApplyStarterTrial(checkoutPlan, null, signup.getEmail(), null);
                            return buildSignupCheckoutSessionParams(checkoutPlan, signup, applyTrial);
                        } catch (StripeException exception) {
                            throw new StripeOperationException(exception);
                        }
                    })
                    .orElseGet(() -> buildBaseCheckoutSessionParams(checkoutPlan, false));

            if (checkoutContext.isPresent()) {
                CheckoutContext context = checkoutContext.get();
                Company company = context.company();
                String customerId = ensureCustomer(company, context.user());
                applyStarterTrial = shouldApplyStarterTrial(checkoutPlan, customerId, context.user().getEmail(), company);
                sessionParamsBuilder
                        .setCustomer(customerId)
                        .setClientReferenceId(company.getId().toString())
                        .putMetadata("company_id", company.getId().toString())
                        .setSubscriptionData(
                                buildSubscriptionData(checkoutPlan, Map.of("company_id", company.getId().toString()), applyStarterTrial)
                        );
            }

            if (pendingSignup.isPresent()) {
                PendingSignup signup = pendingSignup.get();
                sessionParamsBuilder
                        .putMetadata("pending_signup_id", signup.getId().toString())
                        .putMetadata("email", signup.getEmail())
                        .putMetadata("signup_email", signup.getEmail());
            }

            com.stripe.param.checkout.SessionCreateParams sessionParams = sessionParamsBuilder.build();

            Session session = Session.create(sessionParams);
            if (session.getUrl() == null || session.getUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe checkout session did not return a redirect URL");
            }

            pendingSignup.ifPresent(signup -> {
                signup.setStripeCheckoutSessionId(session.getId());
                signup.setStatus(PendingSignupStatus.CHECKOUT_CREATED);
                pendingSignupRepository.save(signup);
            });

            checkoutContext.ifPresent(context -> {
                Company company = context.company();
                log.info("Created Stripe checkout session {} for company {}", session.getId(), company.getId());
            });
            if (checkoutContext.isEmpty()) {
                log.info("Created anonymous Stripe checkout session {}", session.getId());
            }
            return URI.create(session.getUrl());
        } catch (StripeOperationException exception) {
            log.error("Failed to inspect Stripe subscription history for plan {}", checkoutPlan.plan(), exception.getCause());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to validate Stripe subscription history");
        } catch (StripeException exception) {
            log.error("Failed to create Stripe checkout session for lookup_key {}", lookupKey, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create Stripe checkout session");
        }
    }

    public void sendPaymentLink(CreateCheckoutSessionRequest request, String clientIp) {
        PlanCatalogService.CheckoutPlan checkoutPlan = resolveCheckoutPlan(request);
        String lookupKey = checkoutPlan.lookupKey();
        PendingSignup pendingSignup = createPendingSignup(request, lookupKey, clientIp);

        try {
            boolean applyStarterTrial = shouldApplyStarterTrial(checkoutPlan, null, pendingSignup.getEmail(), null);
            com.stripe.param.checkout.SessionCreateParams sessionParams =
                    buildSignupCheckoutSessionParams(checkoutPlan, pendingSignup, applyStarterTrial).build();
            Session session = Session.create(sessionParams);
            if (session.getUrl() == null || session.getUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe checkout session did not return a redirect URL");
            }

            pendingSignup.setStripeCheckoutSessionId(session.getId());
            pendingSignup.setStatus(PendingSignupStatus.CHECKOUT_CREATED);
            pendingSignupRepository.save(pendingSignup);

            emailService.sendPaymentLinkEmail(new PaymentLinkEmailPayload(
                    pendingSignup.getEmail(),
                    pendingSignup.getFirstName(),
                    pendingSignup.getCompanyName(),
                    session.getUrl()
            ));
            log.info(
                    "event=payment_link_sent pending_signup_id={} lookup_key={} email={}",
                    pendingSignup.getId(),
                    lookupKey,
                    pendingSignup.getEmail()
            );
        } catch (StripeException exception) {
            pendingSignup.setStatus(PendingSignupStatus.FAILED);
            pendingSignup.setFailureReason("Failed to create Stripe checkout session");
            pendingSignupRepository.save(pendingSignup);
            log.error(
                    "event=payment_link_failed pending_signup_id={} lookup_key={} email={}",
                    pendingSignup.getId(),
                    lookupKey,
                    pendingSignup.getEmail(),
                    exception
            );
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create Stripe checkout session");
        }
    }

    public URI createPortalSession(String rawSessionId) {
        String sessionId = sanitizeSessionId(rawSessionId);
        Company company = companyAccessService.getActiveMembership().getCompany();

        try {
            Session checkoutSession = Session.retrieve(sessionId);
            String customerId = checkoutSession.getCustomer();
            if (customerId == null || customerId.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Checkout session is missing Stripe customer information");
            }
            assertPortalSessionOwnership(company, checkoutSession, customerId);

            com.stripe.model.billingportal.Session portalSession = com.stripe.model.billingportal.Session.create(
                    SessionCreateParams.builder()
                            .setCustomer(customerId)
                            .setReturnUrl(appProperties.getBaseUrl())
                            .build()
            );
            if (portalSession.getUrl() == null || portalSession.getUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe billing portal did not return a redirect URL");
            }

            log.info("Created Stripe billing portal session for checkout session {}", sessionId);
            return URI.create(portalSession.getUrl());
        } catch (StripeException exception) {
            log.error("Failed to create Stripe portal session for session_id {}", sessionId, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create Stripe billing portal session");
        }
    }

    @Transactional
    public CancelSubscriptionResponse cancelCurrentSubscription() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        String subscriptionId = company.getStripeSubscriptionId();
        if (subscriptionId == null || subscriptionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Company has no Stripe subscription to cancel");
        }

        try {
            Subscription subscription = Subscription.retrieve(subscriptionId);
            if (!"canceled".equalsIgnoreCase(subscription.getStatus())) {
                subscription.update(SubscriptionUpdateParams.builder()
                        .setCancelAtPeriodEnd(true)
                        .build());
            }
        } catch (StripeException exception) {
            log.error("Failed to cancel Stripe subscription {} for company {}", subscriptionId, company.getId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to cancel Stripe subscription");
        }

        applySubscriptionCancellation(company, Instant.now());
        return new CancelSubscriptionResponse(
                "Subscription canceled",
                company.getSubscriptionStatus(),
                company.getSubscriptionCancelledAt(),
                company.getSubscriptionGraceUntil()
        );
    }

    @Transactional
    public void syncCurrentSubscriptionSnapshotIfMissingPeriodEnd() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        if (company.getSubscriptionCurrentPeriodEnd() != null) {
            return;
        }
        String subscriptionId = company.getStripeSubscriptionId();
        if (subscriptionId == null || subscriptionId.isBlank()) {
            return;
        }

        try {
            Subscription subscription = Subscription.retrieve(subscriptionId);
            company.setSubscriptionStatus(subscription.getStatus());
            company.setStripePriceId(resolvePriceId(subscription));
            company.setPlanCode(resolvePlanCode(resolveLookupKey(subscription, company.getPlanCode())));
            company.setSubscriptionCurrentPeriodEnd(resolveCurrentPeriodEnd(subscription));
            synchronizeCancellationState(company, subscription);
            companyRepository.save(company);
            log.info("Synchronized missing subscription period end for company {}", company.getId());
        } catch (StripeException exception) {
            log.warn(
                    "Could not synchronize missing subscription period end for company {} and subscription {}",
                    company.getId(),
                    subscriptionId,
                    exception
            );
        }
    }

    @Transactional
    public ReactivateSubscriptionResponse reactivateCurrentSubscription() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        String subscriptionId = company.getStripeSubscriptionId();
        if (subscriptionId == null || subscriptionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Company has no Stripe subscription to reactivate");
        }

        Subscription subscription;
        try {
            subscription = Subscription.retrieve(subscriptionId);
            if ("canceled".equalsIgnoreCase(subscription.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Stripe subscription already ended; create a new checkout session"
                );
            }
            subscription = subscription.update(SubscriptionUpdateParams.builder()
                    .setCancelAtPeriodEnd(false)
                    .build());
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (StripeException exception) {
            log.error("Failed to reactivate Stripe subscription {} for company {}", subscriptionId, company.getId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to reactivate Stripe subscription");
        }

        company.setSubscriptionStatus(subscription.getStatus());
        company.setSubscriptionCurrentPeriodEnd(resolveCurrentPeriodEnd(subscription));
        clearSubscriptionCancellation(company);
        companyRepository.save(company);
        log.info("event=subscription_reactivated company_id={} stripe_subscription_id={}", company.getId(), subscriptionId);

        return new ReactivateSubscriptionResponse(
                "Subscription reactivated",
                company.getSubscriptionStatus(),
                company.getSubscriptionCurrentPeriodEnd()
        );
    }

    @Transactional
    public void handleWebhook(String payload, String stripeSignature) {
        Event event = constructVerifiedEvent(payload, stripeSignature);
        log.info("event=webhook_received stripe_event_id={} stripe_event_type={}", event.getId(), event.getType());
        if (processedStripeEventRepository.existsByStripeEventId(event.getId())) {
            log.info("event=webhook_duplicate stripe_event_id={} stripe_event_type={}", event.getId(), event.getType());
            return;
        }

        try {
            ProcessedStripeEvent processedStripeEvent = new ProcessedStripeEvent();
            processedStripeEvent.setStripeEventId(event.getId());
            processedStripeEvent.setStripeEventType(event.getType());
            processedStripeEventRepository.saveAndFlush(processedStripeEvent);
        } catch (DataIntegrityViolationException exception) {
            log.info("Ignoring concurrently processed Stripe event {}", event.getId());
            return;
        }

        StripeObject stripeObject = deserializeStripeObject(event);
        switch (event.getType()) {
            case CHECKOUT_COMPLETED -> handleCheckoutCompleted((Session) stripeObject);
            case SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_DELETED -> handleSubscriptionChanged((Subscription) stripeObject);
            default -> log.debug("Ignoring unsupported Stripe event type {}", event.getType());
        }
    }

    private Event constructVerifiedEvent(String payload, String stripeSignature) {
        try {
            return Webhook.constructEvent(payload, stripeSignature, stripeProperties.getWebhookSecret());
        } catch (SignatureVerificationException exception) {
            log.warn("Rejected Stripe webhook with invalid signature");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe signature");
        }
    }

    private StripeObject deserializeStripeObject(Event event) {
        try {
            Optional<StripeObject> stripeObject = event.getDataObjectDeserializer().getObject();
            if (stripeObject.isPresent()) {
                return stripeObject.get();
            }
            return event.getDataObjectDeserializer().deserializeUnsafe();
        } catch (EventDataObjectDeserializationException exception) {
            log.error("Failed to deserialize Stripe event {}", event.getId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to deserialize Stripe event payload");
        }
    }

    private void handleCheckoutCompleted(Session session) {
        synchronizePendingSignupFromCheckoutSession(session);
        Optional<Company> company = resolveCompanyForCheckoutSession(session);
        if (company.isEmpty()) {
            log.warn("Ignoring checkout.session.completed for Stripe session {} because no company linkage was found", session.getId());
            return;
        }
        Company resolvedCompany = company.get();
        resolvedCompany.setStripeCustomerId(session.getCustomer());
        resolvedCompany.setStripeSubscriptionId(session.getSubscription());
        resolvedCompany.setSubscriptionStatus(resolveSessionSubscriptionStatus(session));
        resolvedCompany.setSubscriptionCurrentPeriodEnd(resolveSessionCurrentPeriodEnd(session));
        clearSubscriptionCancellation(resolvedCompany);
        resolvedCompany.setPlanCode(resolvePlanCode(Optional.ofNullable(session.getMetadata()).orElse(Map.of()).get("lookup_key")));
        companyRepository.save(resolvedCompany);
        log.info("Processed Stripe checkout.session.completed for company {}", resolvedCompany.getId());
    }

    private void handleSubscriptionChanged(Subscription subscription) {
        Optional<Company> company = resolveCompanyForSubscription(subscription);
        if (company.isEmpty()) {
            log.warn("Ignoring subscription event {} for Stripe subscription {} because no company linkage was found",
                    subscription.getStatus(), subscription.getId());
            return;
        }
        Company resolvedCompany = company.get();
        resolvedCompany.setStripeCustomerId(subscription.getCustomer());
        resolvedCompany.setStripeSubscriptionId(subscription.getId());
        resolvedCompany.setSubscriptionStatus(subscription.getStatus());
        resolvedCompany.setStripePriceId(resolvePriceId(subscription));
        resolvedCompany.setPlanCode(resolvePlanCode(resolveLookupKey(subscription, resolvedCompany.getPlanCode())));
        resolvedCompany.setSubscriptionCurrentPeriodEnd(resolveCurrentPeriodEnd(subscription));
        synchronizeCancellationState(resolvedCompany, subscription);
        companyRepository.save(resolvedCompany);
        log.info("Processed Stripe subscription event {} for company {}", subscription.getStatus(), resolvedCompany.getId());
    }

    private Optional<Company> resolveCompanyForCheckoutSession(Session session) {
        String pendingSignupId = Optional.ofNullable(session.getMetadata()).orElse(Map.of()).get("pending_signup_id");
        if (pendingSignupId != null && !pendingSignupId.isBlank()) {
            return pendingSignupRepository.findById(parseUuid(pendingSignupId))
                    .flatMap(signup -> Optional.ofNullable(signup.getCompletedCompanyId()))
                    .flatMap(companyRepository::findById);
        }
        String companyId = Optional.ofNullable(session.getMetadata()).orElse(Map.of()).get("company_id");
        if (companyId != null && !companyId.isBlank()) {
            return companyRepository.findById(parseUuid(companyId));
        }
        String customerId = session.getCustomer();
        if (customerId != null && !customerId.isBlank()) {
            return companyRepository.findByStripeCustomerId(customerId);
        }
        return Optional.empty();
    }

    private Optional<Company> resolveCompanyForSubscription(Subscription subscription) {
        if (subscription.getId() != null) {
            Optional<Company> bySubscriptionId = companyRepository.findByStripeSubscriptionId(subscription.getId());
            if (bySubscriptionId.isPresent()) {
                return bySubscriptionId;
            }
        }
        String customerId = subscription.getCustomer();
        if (customerId != null && !customerId.isBlank()) {
            return companyRepository.findByStripeCustomerId(customerId);
        }
        String companyId = Optional.ofNullable(subscription.getMetadata()).orElse(Map.of()).get("company_id");
        if (companyId != null && !companyId.isBlank()) {
            return companyRepository.findById(parseUuid(companyId));
        }
        return Optional.empty();
    }

    @Transactional
    public LoginResponse finalizeCheckoutSignup(String rawSessionId) {
        String sessionId = sanitizeSessionId(rawSessionId);

        PendingSignup pendingSignup = pendingSignupRepository.findByStripeCheckoutSessionId(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checkout session not found"));

        if (pendingSignup.getStatus() != PendingSignupStatus.COMPLETED) {
            try {
                Session session = Session.retrieve(sessionId);
                if (!"complete".equalsIgnoreCase(session.getStatus()) || !isSuccessfulCheckoutPaymentStatus(session.getPaymentStatus())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Checkout session is not paid yet");
                }
                synchronizePendingSignupFromCheckoutSession(session);
                pendingSignup = pendingSignupRepository.findById(pendingSignup.getId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pending signup not found"));
            } catch (StripeException exception) {
                log.error("Failed to validate Stripe checkout session {}", sessionId, exception);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to validate Stripe checkout session");
            }
        }

        if (pendingSignup.getStatus() != PendingSignupStatus.COMPLETED || pendingSignup.getCompletedUserId() == null) {
            if (pendingSignup.getStatus() == PendingSignupStatus.FAILED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        pendingSignup.getFailureReason() == null ? "Signup could not be completed" : pendingSignup.getFailureReason());
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Signup is still processing");
        }

        User user = userRepository.findById(pendingSignup.getCompletedUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Created user not found"));
        CompanyMembership membership = getPreferredActiveMembership(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No company access"));

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), buildJwtClaims(user, membership));
        return new LoginResponse(token, user.getId(), user.getEmail(), user.getLastLoginAt());
    }

    private String ensureCustomer(Company company, User user) throws StripeException {
        if (company.getStripeCustomerId() != null && !company.getStripeCustomerId().isBlank()) {
            return company.getStripeCustomerId();
        }

        Customer customer = Customer.create(
                CustomerCreateParams.builder()
                        .setEmail(user.getEmail())
                        .setName(company.getName())
                        .putMetadata("company_id", company.getId().toString())
                        .putMetadata("user_id", user.getId().toString())
                        .build()
        );
        company.setStripeCustomerId(customer.getId());
        companyRepository.save(company);
        return customer.getId();
    }

    private void applySubscriptionCancellation(Company company, Instant cancelledAt) {
        company.setSubscriptionStatus("canceled");
        company.setSubscriptionCancelledAt(cancelledAt);
        company.setSubscriptionGraceUntil(cancelledAt.plus(SUBSCRIPTION_CANCELLATION_GRACE));
        company.setLeadsDeactivatedAt(null);
        companyRepository.save(company);
        log.info(
                "event=subscription_canceled company_id={} stripe_subscription_id={} grace_until={}",
                company.getId(),
                company.getStripeSubscriptionId(),
                company.getSubscriptionGraceUntil()
        );
    }

    private void synchronizeCancellationState(Company company, Subscription subscription) {
        String status = subscription.getStatus();
        if (Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd())) {
            Instant cancelledAt = company.getSubscriptionCancelledAt() == null
                    ? Instant.now()
                    : company.getSubscriptionCancelledAt();
            applyCancellationFields(company, cancelledAt);
            return;
        }
        if ("active".equalsIgnoreCase(status) || "trialing".equalsIgnoreCase(status)) {
            clearSubscriptionCancellation(company);
            return;
        }
        if ("canceled".equalsIgnoreCase(status) && company.getSubscriptionCancelledAt() == null) {
            Long canceledAt = subscription.getCanceledAt();
            applyCancellationFields(company, canceledAt == null ? Instant.now() : Instant.ofEpochSecond(canceledAt));
        }
    }

    private void applyCancellationFields(Company company, Instant cancelledAt) {
        company.setSubscriptionCancelledAt(cancelledAt);
        company.setSubscriptionGraceUntil(cancelledAt.plus(SUBSCRIPTION_CANCELLATION_GRACE));
        company.setLeadsDeactivatedAt(null);
    }

    private void clearSubscriptionCancellation(Company company) {
        company.setSubscriptionCancelledAt(null);
        company.setSubscriptionGraceUntil(null);
        company.setLeadsDeactivatedAt(null);
    }

    private PlanCatalogService.CheckoutPlan resolveCheckoutPlan(CreateCheckoutSessionRequest request) {
        String rawPlan = request.getPlan();
        if (rawPlan == null || rawPlan.isBlank()) {
            rawPlan = request.getLookupKey();
        }
        return planCatalogService.resolveCheckoutPlan(rawPlan);
    }

    private boolean shouldApplyStarterTrial(
            PlanCatalogService.CheckoutPlan checkoutPlan,
            String customerId,
            String email,
            Company company
    ) throws StripeException {
        if (!checkoutPlan.isStarter()) {
            return false;
        }
        return !hasPriorStripeSubscription(customerId, email, company);
    }

    private boolean hasPriorStripeSubscription(String customerId, String email, Company company) throws StripeException {
        if (company != null && hasLocalSubscriptionHistory(company)) {
            return true;
        }
        if (customerId != null && !customerId.isBlank() && hasSubscriptionHistoryForCustomer(customerId)) {
            return true;
        }
        if (email == null || email.isBlank()) {
            return false;
        }

        CustomerListParams customerParams = CustomerListParams.builder()
                .setEmail(email)
                .setLimit(10L)
                .build();
        for (Customer customer : Customer.list(customerParams).getData()) {
            if (hasSubscriptionHistoryForCustomer(customer.getId())) {
                return true;
            }
        }
        return false;
    }

    private boolean hasLocalSubscriptionHistory(Company company) {
        if (company.getStripeSubscriptionId() != null && !company.getStripeSubscriptionId().isBlank()) {
            return true;
        }
        String status = company.getSubscriptionStatus();
        return status != null && !status.isBlank();
    }

    private boolean hasSubscriptionHistoryForCustomer(String customerId) throws StripeException {
        // Stripe keeps canceled subscriptions attached to the Customer; status=all catches active, trialing, and canceled history.
        SubscriptionListParams subscriptionParams = SubscriptionListParams.builder()
                .setCustomer(customerId)
                .setStatus(SubscriptionListParams.Status.ALL)
                .setLimit(1L)
                .build();
        return !Subscription.list(subscriptionParams).getData().isEmpty();
    }

    com.stripe.param.checkout.SessionCreateParams.SubscriptionData buildSubscriptionData(
            PlanCatalogService.CheckoutPlan checkoutPlan,
            Map<String, String> metadata,
            boolean applyStarterTrial
    ) {
        com.stripe.param.checkout.SessionCreateParams.SubscriptionData.Builder builder =
                com.stripe.param.checkout.SessionCreateParams.SubscriptionData.builder()
                        .putMetadata("plan", checkoutPlan.plan())
                        .putMetadata("lookup_key", checkoutPlan.lookupKey())
                        .putMetadata("plan_code", checkoutPlan.planCode());
        metadata.forEach(builder::putMetadata);
        if (applyStarterTrial && checkoutPlan.isStarter()) {
            builder.setTrialPeriodDays(STARTER_TRIAL_PERIOD_DAYS);
        }
        return builder.build();
    }

    private com.stripe.param.checkout.SessionCreateParams.Builder buildBaseCheckoutSessionParams(
            PlanCatalogService.CheckoutPlan checkoutPlan,
            boolean applyStarterTrial
    ) {
        com.stripe.param.checkout.SessionCreateParams.Builder builder =
                com.stripe.param.checkout.SessionCreateParams.builder()
                .setMode(com.stripe.param.checkout.SessionCreateParams.Mode.SUBSCRIPTION)
                .setBillingAddressCollection(
                        com.stripe.param.checkout.SessionCreateParams.BillingAddressCollection.AUTO
                )
                .setSuccessUrl(successUrl())
                .setCancelUrl(cancelUrl())
                .putMetadata("plan", checkoutPlan.plan())
                .putMetadata("lookup_key", checkoutPlan.lookupKey())
                .putMetadata("plan_code", checkoutPlan.planCode())
                .addLineItem(
                        com.stripe.param.checkout.SessionCreateParams.LineItem.builder()
                                .setPrice(checkoutPlan.priceId())
                                .setQuantity(1L)
                                .build()
                )
                .setSubscriptionData(
                        buildSubscriptionData(checkoutPlan, Map.of(), applyStarterTrial)
                );
        if (shouldCollectPaymentMethodUpfront(checkoutPlan, applyStarterTrial)) {
            builder.setPaymentMethodCollection(
                    com.stripe.param.checkout.SessionCreateParams.PaymentMethodCollection.ALWAYS
            );
        }
        return builder;
    }

    boolean shouldCollectPaymentMethodUpfront(
            PlanCatalogService.CheckoutPlan checkoutPlan,
            boolean applyStarterTrial
    ) {
        return applyStarterTrial && checkoutPlan.isStarter();
    }

    private com.stripe.param.checkout.SessionCreateParams.Builder buildSignupCheckoutSessionParams(
            PlanCatalogService.CheckoutPlan checkoutPlan,
            PendingSignup signup,
            boolean applyStarterTrial
    ) {
        return buildBaseCheckoutSessionParams(checkoutPlan, applyStarterTrial)
                .setCustomerEmail(signup.getEmail())
                .putMetadata("pending_signup_id", signup.getId().toString())
                .putMetadata("email", signup.getEmail())
                .putMetadata("signup_email", signup.getEmail())
                .setSubscriptionData(
                        buildSubscriptionData(
                                checkoutPlan,
                                Map.of(
                                        "pending_signup_id", signup.getId().toString(),
                                        "email", signup.getEmail()
                                ),
                                applyStarterTrial
                        )
                );
    }

    private Optional<CheckoutContext> resolveCheckoutContext() {
        try {
            CompanyMembership membership = companyAccessService.getActiveMembership();
            Company company = membership.getCompany();
            User user = userRepository.findById(membership.getUser().getId()).orElse(null);
            if (user == null) {
                return Optional.empty();
            }
            return Optional.of(new CheckoutContext(company, user));
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode() == HttpStatus.UNAUTHORIZED
                    || exception.getStatusCode() == HttpStatus.FORBIDDEN
                    || exception.getStatusCode() == HttpStatus.CONFLICT) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    private PendingSignup createPendingSignup(CreateCheckoutSessionRequest request, String lookupKey, String clientIp) {
        String email = normalizeEmail(request.getEmail());
        enforcePaymentLinkRateLimit(email, clientIp);
        String password = requireText(request.getPassword(), "password is required");
        String retypePassword = requireText(request.getRetypePassword(), "retype_password is required");
        String firstName = requireText(request.getFirstName(), "first_name is required");
        String lastName = requireText(request.getLastName(), "last_name is required");
        String companyName = requireText(request.getCompanyName(), "company_name is required");

        validatePasswordRules(password, retypePassword, email);

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new FieldValidationException(
                    HttpStatus.CONFLICT,
                    "Validation failed",
                    List.of(fieldError("email", "Email already in use"))
            );
        }

        expireStalePendingSignups(email);

        if (pendingSignupRepository.existsByEmailIgnoreCaseAndStatusIn(email, ACTIVE_PENDING_SIGNUP_STATUSES)) {
            log.info("event=validation_failed reason=active_pending_signup email={}", email);
            throw new FieldValidationException(
                    HttpStatus.CONFLICT,
                    "Validation failed",
                    List.of(fieldError("email", "A payment link was already sent for this email"))
            );
        }

        PendingSignup pendingSignup = new PendingSignup();
        pendingSignup.setEmail(email);
        pendingSignup.setPasswordHash(passwordEncoder.encode(password));
        pendingSignup.setFirstName(firstName);
        pendingSignup.setLastName(lastName);
        pendingSignup.setCompanyName(companyName);
        pendingSignup.setPlanCode(resolvePlanCode(lookupKey));
        pendingSignup.setLookupKey(lookupKey);
        pendingSignup.setStatus(PendingSignupStatus.PENDING);
        log.info("event=pending_signup_created lookup_key={} email={}", lookupKey, email);
        return pendingSignupRepository.save(pendingSignup);
    }

    void expireStalePendingSignups(String email) {
        Instant expiresBefore = Instant.now().minus(PENDING_SIGNUP_EXPIRATION);
        List<PendingSignup> staleSignups = pendingSignupRepository.findByEmailIgnoreCaseAndStatusInAndCreatedAtBefore(
                email,
                ACTIVE_PENDING_SIGNUP_STATUSES,
                expiresBefore
        );
        if (staleSignups.isEmpty()) {
            return;
        }

        staleSignups.forEach(signup -> {
            signup.setStatus(PendingSignupStatus.EXPIRED);
            signup.setFailureReason("Checkout was not completed within 30 minutes");
        });
        pendingSignupRepository.saveAll(staleSignups);
        log.info("event=pending_signups_expired count={} email={}", staleSignups.size(), email);
    }

    private void enforcePaymentLinkRateLimit(String email, String clientIp) {
        String key = email + "|" + (clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim());
        Instant now = Instant.now();
        Instant previous = recentPaymentLinkRequests.get(key);
        if (previous != null && previous.plus(PAYMENT_LINK_RATE_LIMIT_WINDOW).isAfter(now)) {
            log.info("event=validation_failed reason=payment_link_rate_limited email={} ip={}", email, clientIp);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another payment link");
        }
        recentPaymentLinkRequests.put(key, now);
        recentPaymentLinkRequests.entrySet().removeIf(entry -> entry.getValue().plus(PAYMENT_LINK_RATE_LIMIT_WINDOW).isBefore(now));
    }

    private void synchronizePendingSignupFromCheckoutSession(Session session) {
        PendingSignup pendingSignup = resolvePendingSignup(session).orElse(null);
        if (pendingSignup == null || pendingSignup.getStatus() == PendingSignupStatus.COMPLETED) {
            return;
        }

        try {
            pendingSignup.setStripeCheckoutSessionId(session.getId());
            pendingSignup.setStripeCustomerId(session.getCustomer());
            pendingSignup.setStripeSubscriptionId(session.getSubscription());

            if (userRepository.findByEmailIgnoreCase(pendingSignup.getEmail()).isPresent()) {
                markPendingSignupFailed(pendingSignup, "Email already in use");
                log.warn(
                        "event=finalize_failed pending_signup_id={} reason=email_already_in_use",
                        pendingSignup.getId()
                );
                return;
            }

            User user = new User();
            user.setEmail(pendingSignup.getEmail());
            user.setFirstName(pendingSignup.getFirstName());
            user.setLastName(pendingSignup.getLastName());
            user.setPasswordHash(pendingSignup.getPasswordHash());
            user.setPasswordUpdatedAt(Instant.now());
            user.setEmailVerified(Boolean.TRUE);
            user = userRepository.save(user);

            Company company = new Company();
            company.setName(pendingSignup.getCompanyName());
            company.setTimezone("UTC");
            company.setPlanCode(pendingSignup.getPlanCode());
            company.setStripeCustomerId(session.getCustomer());
            company.setStripeSubscriptionId(session.getSubscription());
            company.setSubscriptionStatus(resolveSessionSubscriptionStatus(session));
            company.setSubscriptionCurrentPeriodEnd(resolveSessionCurrentPeriodEnd(session));
            company = companyRepository.save(company);

            CompanyMembership membership = new CompanyMembership();
            membership.setCompany(company);
            membership.setUser(user);
            membership.setRole(MembershipRole.MANAGER);
            membership.setStatus(MembershipStatus.ACTIVE);
            companyMembershipRepository.save(membership);

            pendingSignup.setCompletedUserId(user.getId());
            pendingSignup.setCompletedCompanyId(company.getId());
            pendingSignup.setStatus(PendingSignupStatus.COMPLETED);
            pendingSignup.setCompletedAt(Instant.now());
            pendingSignup.setFailureReason(null);
            pendingSignupRepository.save(pendingSignup);
            log.info(
                    "event=signup_finalized pending_signup_id={} user_id={} company_id={} stripe_customer_id={} stripe_subscription_id={}",
                    pendingSignup.getId(),
                    user.getId(),
                    company.getId(),
                    session.getCustomer(),
                    session.getSubscription()
            );
        } catch (RuntimeException exception) {
            log.error(
                    "event=finalize_failed pending_signup_id={} stripe_checkout_session_id={} reason=exception",
                    pendingSignup.getId(),
                    session.getId(),
                    exception
            );
            throw exception;
        }
    }

    private void markPendingSignupFailed(PendingSignup pendingSignup, String reason) {
        pendingSignup.setStatus(PendingSignupStatus.FAILED);
        pendingSignup.setFailureReason(reason);
        pendingSignupRepository.save(pendingSignup);
    }

    void assertPortalSessionOwnership(Company company, Session checkoutSession, String customerId) {
        String companyCustomerId = company.getStripeCustomerId();
        if (companyCustomerId != null && !companyCustomerId.isBlank()) {
            if (!companyCustomerId.equals(customerId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checkout session does not belong to the active company");
            }
            return;
        }

        String metadataCompanyId = Optional.ofNullable(checkoutSession.getMetadata()).orElse(Map.of()).get("company_id");
        if (metadataCompanyId != null && !metadataCompanyId.isBlank()) {
            UUID checkoutCompanyId = parseUuid(metadataCompanyId);
            if (!company.getId().equals(checkoutCompanyId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checkout session does not belong to the active company");
            }
            company.setStripeCustomerId(customerId);
            companyRepository.save(company);
            return;
        }

        if (companyRepository.findByStripeCustomerId(customerId)
                .map(Company::getId)
                .filter(company.getId()::equals)
                .isPresent()) {
            company.setStripeCustomerId(customerId);
            companyRepository.save(company);
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checkout session does not belong to the active company");
    }

    private Optional<PendingSignup> resolvePendingSignup(Session session) {
        String pendingSignupId = Optional.ofNullable(session.getMetadata()).orElse(Map.of()).get("pending_signup_id");
        if (pendingSignupId != null && !pendingSignupId.isBlank()) {
            return pendingSignupRepository.findById(parseUuid(pendingSignupId));
        }
        return pendingSignupRepository.findByStripeCheckoutSessionId(session.getId());
    }

    private Optional<CompanyMembership> getPreferredActiveMembership(User user) {
        return companyMembershipRepository
                .findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                        user.getId(),
                        EnumSet.of(MembershipRole.ADMIN, MembershipRole.MANAGER),
                        EnumSet.of(MembershipStatus.ACTIVE)
                )
                .stream()
                .findFirst()
                .or(() -> companyMembershipRepository
                        .findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                                user.getId(),
                                EnumSet.of(MembershipStatus.ACTIVE)
                        )
                        .stream()
                        .findFirst());
    }

    private Map<String, Object> buildJwtClaims(User user, CompanyMembership membership) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("companyId", membership.getCompany().getId().toString());
        claims.put("role", membership.getRole().name());
        return claims;
    }

    private String normalizeEmail(String rawEmail) {
        String email = requireText(rawEmail, "email is required").toLowerCase();
        if (!email.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email must be valid");
        }
        return email;
    }

    private String requireText(String rawValue, String message) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return rawValue.trim();
    }

    private void validatePasswordRules(String password, String retypePassword, String email) {
        if (!password.equals(retypePassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        if (password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        String emailLocalPart = email.split("@", 2)[0];
        if (!emailLocalPart.isBlank() && password.toLowerCase().contains(emailLocalPart.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too easy to guess");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must include letters and numbers");
        }
    }

    private String sanitizeLookupKey(String rawLookupKey) {
        if (rawLookupKey == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lookup_key is required");
        }
        String lookupKey = rawLookupKey.trim();
        if (!lookupKey.matches("^[A-Za-z0-9._:-]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lookup_key contains invalid characters");
        }
        return lookupKey;
    }

    private String sanitizeSessionId(String rawSessionId) {
        if (rawSessionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id is required");
        }
        String sessionId = rawSessionId.trim();
        if (!sessionId.matches("^cs_(test|live)_[A-Za-z0-9]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id must be a valid Stripe Checkout Session id");
        }
        return sessionId;
    }

    boolean isSuccessfulCheckoutPaymentStatus(String paymentStatus) {
        return "paid".equalsIgnoreCase(paymentStatus) || "no_payment_required".equalsIgnoreCase(paymentStatus);
    }

    String resolveSessionSubscriptionStatus(Session session) {
        Subscription sessionSubscription = session.getSubscriptionObject();
        if (sessionSubscription != null && sessionSubscription.getStatus() != null) {
            return sessionSubscription.getStatus();
        }
        String subscriptionId = session.getSubscription();
        if (subscriptionId != null && !subscriptionId.isBlank()) {
            try {
                Subscription retrievedSubscription = Subscription.retrieve(subscriptionId);
                if (retrievedSubscription.getStatus() != null && !retrievedSubscription.getStatus().isBlank()) {
                    return retrievedSubscription.getStatus();
                }
            } catch (StripeException exception) {
                log.warn("Could not retrieve Stripe subscription status for session {}", session.getId(), exception);
            }
        }
        return "active";
    }

    private Instant resolveSessionCurrentPeriodEnd(Session session) {
        Subscription sessionSubscription = session.getSubscriptionObject();
        if (sessionSubscription != null) {
            Instant resolved = resolveCurrentPeriodEnd(sessionSubscription);
            if (resolved != null) {
                return resolved;
            }
        }
        String subscriptionId = session.getSubscription();
        if (subscriptionId != null && !subscriptionId.isBlank()) {
            try {
                Subscription retrievedSubscription = Subscription.retrieve(subscriptionId);
                return resolveCurrentPeriodEnd(retrievedSubscription);
            } catch (StripeException exception) {
                log.warn("Could not retrieve Stripe subscription period end for session {}", session.getId(), exception);
            }
        }
        return null;
    }

    private String resolvePriceId(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return null;
        }
        return subscription.getItems().getData().get(0).getPrice().getId();
    }

    private String resolveLookupKey(Subscription subscription, String fallback) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return fallback;
        }
        String lookupKey = subscription.getItems().getData().get(0).getPrice().getLookupKey();
        return lookupKey == null || lookupKey.isBlank() ? fallback : lookupKey;
    }

    private Instant resolveCurrentPeriodEnd(Subscription subscription) {
        Long currentPeriodEnd = subscription.getCurrentPeriodEnd();
        return currentPeriodEnd == null ? null : Instant.ofEpochSecond(currentPeriodEnd);
    }

    private UUID parseUuid(String rawUuid) {
        try {
            return UUID.fromString(rawUuid);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe metadata company_id");
        }
    }

    private String resolvePlanCode(String lookupKey) {
        if (lookupKey == null || lookupKey.isBlank()) {
            return "STARTER";
        }
        String normalized = lookupKey.trim().toUpperCase();
        if (normalized.equals("STARTER") || normalized.equals("PRO") || normalized.equals("ENTERPRISE")) {
            return normalized;
        }
        return planCatalogService.resolvePlanCodeForLookupKey(lookupKey);
    }

    private Map<String, String> fieldError(String field, String message) {
        return Map.of("field", field, "message", message);
    }

    private String successUrl() {
        return appProperties.getBaseUrl() + "/?success=true&session_id={CHECKOUT_SESSION_ID}";
    }

    private String cancelUrl() {
        return appProperties.getBaseUrl() + "/?canceled=true";
    }

    private record CheckoutContext(Company company, User user) {
    }

    private static class StripeOperationException extends RuntimeException {
        StripeOperationException(StripeException cause) {
            super(cause);
        }
    }
}
