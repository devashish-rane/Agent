package com.frontier.agent.observability.logging;

import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Emits structured audit logs around controller invocations. Logged fields intentionally
 * avoid sensitive payloads while still capturing the shape of the request for debugging
 * and security reviews.
 */
@Aspect
public class AuditLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditLoggingAspect.class);

    @Before("within(@org.springframework.web.bind.annotation.RestController *)")
    public void beforeRest(JoinPoint joinPoint) {
        HttpServletRequest request = currentRequest();
        log.info("audit.start method={} path={} correlationId={} args={}",
                joinPoint.getSignature().toShortString(),
                request != null ? request.getRequestURI() : "<no-request>",
                MDC.get(CorrelationIdFilter.HEADER),
                joinPoint.getArgs());
    }

    @AfterReturning("within(@org.springframework.web.bind.annotation.RestController *)")
    public void afterRest(JoinPoint joinPoint) {
        HttpServletRequest request = currentRequest();
        log.info("audit.finish method={} path={} correlationId={}",
                joinPoint.getSignature().toShortString(),
                request != null ? request.getRequestURI() : "<no-request>",
                MDC.get(CorrelationIdFilter.HEADER));
    }

    private HttpServletRequest currentRequest() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletAttributes) {
            return servletAttributes.getRequest();
        }
        return null;
    }
}
