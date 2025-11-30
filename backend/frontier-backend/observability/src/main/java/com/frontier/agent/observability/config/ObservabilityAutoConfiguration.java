package com.frontier.agent.observability.config;

import io.micrometer.core.instrument.MeterRegistry;
import com.frontier.agent.observability.logging.AuditLoggingAspect;
import com.frontier.agent.observability.logging.CorrelationIdFilter;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.aop.ObservedAspect;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.brave.bridge.BraveTracer;
import jakarta.servlet.Filter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import zipkin2.reporter.AsyncReporter;
import zipkin2.reporter.brave.BraveFinishedSpanHandler;
import zipkin2.reporter.urlconnection.URLConnectionSender;

/**
 * Centralized observability wiring shared by API and worker modules. We keep the beans
 * lean and safe for local development: when Zipkin/X-Ray endpoints are unavailable we
 * log a warning instead of failing startup to avoid blocking deployments.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(TracingProperties.class)
public class ObservabilityAutoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(ObservabilityAutoConfiguration.class);

    @Bean
    @ConditionalOnMissingBean
    public ObservationRegistry observationRegistry() {
        return ObservationRegistry.create();
    }

    @Bean
    @ConditionalOnMissingBean
    public ObservedAspect observedAspect(ObservationRegistry registry) {
        return new ObservedAspect(registry);
    }

    @Bean
    @ConditionalOnMissingBean
    public Tracer tracer(TracingProperties properties) {
        try {
            var sender = URLConnectionSender.create(properties.getZipkinEndpoint());
            var reporter = AsyncReporter.create(sender);
            return BraveTracer.builder()
                    .finishedSpanHandler(BraveFinishedSpanHandler.create(reporter))
                    .build();
        } catch (Exception ex) {
            log.warn("Tracer fallback to no-op due to configuration issue", ex);
            return BraveTracer.noop();
        }
    }

    @Bean
    public Filter correlationIdFilter() {
        return new CorrelationIdFilter();
    }

    @Bean
    public AuditLoggingAspect auditLoggingAspect() {
        return new AuditLoggingAspect();
    }

    @Bean
    @ConditionalOnMissingBean
    public MeterRegistryCustomizer meterRegistryCustomizer() {
        return new MeterRegistryCustomizer();
    }

    public static class MeterRegistryCustomizer implements org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer<MeterRegistry> {
        @Override
        public void customize(MeterRegistry registry) {
            registry.config().commonTags("service", "frontier");
        }
    }
}
