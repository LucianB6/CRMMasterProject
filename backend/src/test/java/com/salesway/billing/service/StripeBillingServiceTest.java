package com.salesway.billing.service;

import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.config.StripeProperties;
import com.salesway.billing.entity.PendingSignup;
import com.salesway.billing.entity.PendingSignupStatus;
import com.salesway.billing.repository.PendingSignupRepository;
import com.salesway.billing.repository.ProcessedStripeEventRepository;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.config.AppProperties;
import com.salesway.email.service.EmailService;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.JwtService;
import com.stripe.Stripe;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StripeBillingServiceTest {
    private static final String WEBHOOK_SECRET = "whsec_test";

    @Mock
    private CompanyAccessService companyAccessService;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private CompanyMembershipRepository companyMembershipRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AppProperties appProperties;
    @Mock
    private StripeCatalogService stripeCatalogService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private PendingSignupRepository pendingSignupRepository;
    @Mock
    private ProcessedStripeEventRepository processedStripeEventRepository;
    @Mock
    private PlanCatalogService planCatalogService;
    @Mock
    private EmailService emailService;

    private StripeBillingService service;

    @BeforeEach
    void setUp() {
        StripeProperties stripeProperties = new StripeProperties();
        stripeProperties.setSecretKey("sk_test_123");
        stripeProperties.setWebhookSecret(WEBHOOK_SECRET);
        stripeProperties.setStarterPriceId("price_starter");
        stripeProperties.setProPriceId("price_pro");
        stripeProperties.setEnterprisePriceId("price_enterprise");
        service = new StripeBillingService(
                companyAccessService,
                companyRepository,
                companyMembershipRepository,
                userRepository,
                appProperties,
                stripeProperties,
                stripeCatalogService,
                passwordEncoder,
                jwtService,
                pendingSignupRepository,
                processedStripeEventRepository,
                planCatalogService,
                emailService
        );
    }

    @Test
    void starterSubscriptionDataIncludesTrialWhenEligible() {
        var subscriptionData = service.buildSubscriptionData(
                new PlanCatalogService.CheckoutPlan("starter", "STARTER", "starter_monthly", "price_starter"),
                java.util.Map.of(),
                true
        );

        assertThat(subscriptionData.getTrialPeriodDays()).isEqualTo(30L);
        assertThat(subscriptionData.getMetadata()).containsEntry("plan", "starter");
    }

    @Test
    void nonStarterSubscriptionDataOmitsTrial() {
        var subscriptionData = service.buildSubscriptionData(
                new PlanCatalogService.CheckoutPlan("pro", "PRO", "pro_monthly", "price_pro"),
                java.util.Map.of(),
                true
        );

        assertThat(subscriptionData.getTrialPeriodDays()).isNull();
        assertThat(subscriptionData.getMetadata()).containsEntry("plan_code", "PRO");
    }

    @Test
    void starterTrialRequiresUpfrontPaymentMethodCollection() {
        assertThat(service.shouldCollectPaymentMethodUpfront(
                new PlanCatalogService.CheckoutPlan("starter", "STARTER", "starter_monthly", "price_starter"),
                true
        )).isTrue();
    }

    @Test
    void nonTrialCheckoutDoesNotForceUpfrontPaymentMethodCollection() {
        assertThat(service.shouldCollectPaymentMethodUpfront(
                new PlanCatalogService.CheckoutPlan("starter", "STARTER", "starter_monthly", "price_starter"),
                false
        )).isFalse();
        assertThat(service.shouldCollectPaymentMethodUpfront(
                new PlanCatalogService.CheckoutPlan("pro", "PRO", "pro_monthly", "price_pro"),
                true
        )).isFalse();
    }

    @Test
    void expireStalePendingSignupsMarksActiveRowsExpired() {
        PendingSignup staleSignup = pendingSignup(UUID.randomUUID());
        staleSignup.setStatus(PendingSignupStatus.CHECKOUT_CREATED);

        when(pendingSignupRepository.findByEmailIgnoreCaseAndStatusInAndCreatedAtBefore(
                eq("ana@example.com"),
                eq(java.util.EnumSet.of(PendingSignupStatus.PENDING, PendingSignupStatus.CHECKOUT_CREATED)),
                any(Instant.class)
        )).thenReturn(java.util.List.of(staleSignup));

        service.expireStalePendingSignups("ana@example.com");

        assertThat(staleSignup.getStatus()).isEqualTo(PendingSignupStatus.EXPIRED);
        assertThat(staleSignup.getFailureReason()).isEqualTo("Checkout was not completed within 30 minutes");
        verify(pendingSignupRepository).saveAll(java.util.List.of(staleSignup));
    }

    @Test
    void duplicateWebhookEventDoesNotCreateUserOrCompanyAgain() {
        String payload = checkoutCompletedPayload("evt_duplicate", UUID.randomUUID());
        when(processedStripeEventRepository.existsByStripeEventId("evt_duplicate")).thenReturn(true);

        service.handleWebhook(payload, signatureHeader(payload));

        verify(userRepository, never()).save(any());
        verify(companyRepository, never()).save(any());
        verify(pendingSignupRepository, never()).save(any());
    }

    @Test
    void checkoutSessionCompletedFinalizesPendingSignup() {
        UUID pendingSignupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        PendingSignup pendingSignup = pendingSignup(pendingSignupId);
        Company completedCompany = new Company();
        completedCompany.setId(companyId);

        String payload = checkoutCompletedPayload("evt_checkout_completed", pendingSignupId);
        when(processedStripeEventRepository.existsByStripeEventId("evt_checkout_completed")).thenReturn(false);
        when(pendingSignupRepository.findById(pendingSignupId)).thenReturn(Optional.of(pendingSignup));
        when(userRepository.findByEmailIgnoreCase("ana@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(userId);
            return user;
        });
        when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> {
            Company company = invocation.getArgument(0);
            if (company.getId() == null) {
                company.setId(companyId);
            }
            return company;
        });
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(completedCompany));
        when(planCatalogService.resolvePlanCodeForLookupKey("starter_monthly")).thenReturn("STARTER");

        service.handleWebhook(payload, signatureHeader(payload));

        ArgumentCaptor<PendingSignup> signupCaptor = ArgumentCaptor.forClass(PendingSignup.class);
        verify(pendingSignupRepository).save(signupCaptor.capture());
        PendingSignup finalizedSignup = signupCaptor.getAllValues().get(signupCaptor.getAllValues().size() - 1);
        assertThat(finalizedSignup.getStatus()).isEqualTo(PendingSignupStatus.COMPLETED);
        assertThat(finalizedSignup.getCompletedUserId()).isEqualTo(userId);
        assertThat(finalizedSignup.getCompletedCompanyId()).isEqualTo(companyId);
        assertThat(finalizedSignup.getStripeCustomerId()).isEqualTo("cus_test_123");
        assertThat(finalizedSignup.getStripeSubscriptionId()).isEqualTo("sub_test_123");

        ArgumentCaptor<CompanyMembership> membershipCaptor = ArgumentCaptor.forClass(CompanyMembership.class);
        verify(companyMembershipRepository).save(membershipCaptor.capture());
        assertThat(membershipCaptor.getValue().getRole()).isEqualTo(MembershipRole.MANAGER);
        assertThat(membershipCaptor.getValue().getStatus()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test
    void successfulCheckoutPaymentStatusAcceptsTrialWithoutImmediateCharge() {
        assertThat(service.isSuccessfulCheckoutPaymentStatus("paid")).isTrue();
        assertThat(service.isSuccessfulCheckoutPaymentStatus("no_payment_required")).isTrue();
        assertThat(service.isSuccessfulCheckoutPaymentStatus("unpaid")).isFalse();
    }

    @Test
    void resolveSessionSubscriptionStatusPrefersExpandedSubscriptionStatus() {
        Session session = mock(Session.class);
        Subscription subscription = mock(Subscription.class);
        when(session.getSubscriptionObject()).thenReturn(subscription);
        when(subscription.getStatus()).thenReturn("trialing");

        assertThat(service.resolveSessionSubscriptionStatus(session)).isEqualTo("trialing");
    }

    @Test
    void assertPortalSessionOwnershipRejectsForeignCustomerForKnownCompany() {
        Company company = existingCompany();
        company.setStripeCustomerId("cus_company");
        Session session = mock(Session.class);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> service.assertPortalSessionOwnership(company, session, "cus_other")
        ).isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Checkout session does not belong to the active company");
    }

    @Test
    void subscriptionUpdatedSynchronizesCompanyStatus() {
        Company company = existingCompany();
        String payload = subscriptionPayload("evt_subscription_updated", "customer.subscription.updated", "past_due");
        when(processedStripeEventRepository.existsByStripeEventId("evt_subscription_updated")).thenReturn(false);
        when(companyRepository.findByStripeSubscriptionId("sub_test_123")).thenReturn(Optional.of(company));
        when(planCatalogService.resolvePlanCodeForLookupKey("pro_monthly")).thenReturn("PRO");

        service.handleWebhook(payload, signatureHeader(payload));

        ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(companyCaptor.capture());
        assertThat(companyCaptor.getValue().getSubscriptionStatus()).isEqualTo("past_due");
        assertThat(companyCaptor.getValue().getStripePriceId()).isEqualTo("price_pro");
        assertThat(companyCaptor.getValue().getPlanCode()).isEqualTo("PRO");
    }

    @Test
    void subscriptionUpdatedWithCancelAtPeriodEndKeepsLocalCancellation() {
        Company company = existingCompany();
        Instant cancelledAt = Instant.parse("2026-04-15T07:00:00Z");
        company.setSubscriptionCancelledAt(cancelledAt);
        company.setSubscriptionGraceUntil(cancelledAt.plus(java.time.Duration.ofDays(30)));
        String payload = subscriptionPayload(
                "evt_subscription_cancel_at_period_end",
                "customer.subscription.updated",
                "active",
                true
        );
        when(processedStripeEventRepository.existsByStripeEventId("evt_subscription_cancel_at_period_end")).thenReturn(false);
        when(companyRepository.findByStripeSubscriptionId("sub_test_123")).thenReturn(Optional.of(company));
        when(planCatalogService.resolvePlanCodeForLookupKey("pro_monthly")).thenReturn("PRO");

        service.handleWebhook(payload, signatureHeader(payload));

        ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(companyCaptor.capture());
        assertThat(companyCaptor.getValue().getSubscriptionStatus()).isEqualTo("active");
        assertThat(companyCaptor.getValue().getSubscriptionCancelledAt()).isEqualTo(cancelledAt);
        assertThat(companyCaptor.getValue().getSubscriptionGraceUntil()).isEqualTo(cancelledAt.plus(java.time.Duration.ofDays(30)));
    }

    @Test
    void subscriptionDeletedSynchronizesCompanyStatus() {
        Company company = existingCompany();
        String payload = subscriptionPayload("evt_subscription_deleted", "customer.subscription.deleted", "canceled");
        when(processedStripeEventRepository.existsByStripeEventId("evt_subscription_deleted")).thenReturn(false);
        when(companyRepository.findByStripeSubscriptionId("sub_test_123")).thenReturn(Optional.of(company));
        when(planCatalogService.resolvePlanCodeForLookupKey("pro_monthly")).thenReturn("PRO");

        service.handleWebhook(payload, signatureHeader(payload));

        ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).save(companyCaptor.capture());
        assertThat(companyCaptor.getValue().getSubscriptionStatus()).isEqualTo("canceled");
        assertThat(companyCaptor.getValue().getPlanCode()).isEqualTo("PRO");
    }

    private PendingSignup pendingSignup(UUID pendingSignupId) {
        PendingSignup pendingSignup = new PendingSignup();
        pendingSignup.setId(pendingSignupId);
        pendingSignup.setEmail("ana@example.com");
        pendingSignup.setPasswordHash("$2a$hash");
        pendingSignup.setFirstName("Ana");
        pendingSignup.setLastName("Pop");
        pendingSignup.setCompanyName("Acme");
        pendingSignup.setPlanCode("STARTER");
        pendingSignup.setLookupKey("starter_monthly");
        pendingSignup.setStatus(PendingSignupStatus.CHECKOUT_CREATED);
        return pendingSignup;
    }

    private Company existingCompany() {
        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        company.setTimezone("UTC");
        company.setPlanCode("STARTER");
        company.setStripeSubscriptionId("sub_test_123");
        company.setStripeCustomerId("cus_test_123");
        return company;
    }

    private String checkoutCompletedPayload(String eventId, UUID pendingSignupId) {
        return """
                {
                  "id": "%s",
                  "object": "event",
                  "api_version": "%s",
                  "type": "checkout.session.completed",
                  "created": 1700000000,
                  "data": {
                    "object": {
                      "id": "cs_test_123",
                      "object": "checkout.session",
                      "mode": "subscription",
                      "status": "complete",
                      "payment_status": "paid",
                      "customer": "cus_test_123",
                      "subscription": "sub_test_123",
                      "metadata": {
                        "pending_signup_id": "%s",
                        "lookup_key": "starter_monthly",
                        "email": "ana@example.com"
                      }
                    }
                  }
                }
                """.formatted(eventId, Stripe.API_VERSION, pendingSignupId);
    }

    private String subscriptionPayload(String eventId, String eventType, String subscriptionStatus) {
        return subscriptionPayload(eventId, eventType, subscriptionStatus, false);
    }

    private String subscriptionPayload(String eventId, String eventType, String subscriptionStatus, boolean cancelAtPeriodEnd) {
        long currentPeriodEnd = Instant.parse("2026-05-01T00:00:00Z").getEpochSecond();
        return """
                {
                  "id": "%s",
                  "object": "event",
                  "api_version": "%s",
                  "type": "%s",
                  "created": 1700000000,
                  "data": {
                    "object": {
                      "id": "sub_test_123",
                      "object": "subscription",
                      "customer": "cus_test_123",
                      "status": "%s",
                      "cancel_at_period_end": %s,
                      "current_period_end": %d,
                      "metadata": {
                        "lookup_key": "pro_monthly"
                      },
                      "items": {
                        "object": "list",
                        "data": [
                          {
                            "id": "si_test_123",
                            "object": "subscription_item",
                            "price": {
                              "id": "price_pro",
                              "object": "price",
                              "lookup_key": "pro_monthly"
                            }
                          }
                        ]
                      }
                    }
                  }
                }
                """.formatted(eventId, Stripe.API_VERSION, eventType, subscriptionStatus, cancelAtPeriodEnd, currentPeriodEnd);
    }

    private String signatureHeader(String payload) {
        long timestamp = Instant.now().getEpochSecond();
        return "t=" + timestamp + ",v1=" + hmacSha256(timestamp + "." + payload, WEBHOOK_SECRET);
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign Stripe webhook test payload", exception);
        }
    }
}
