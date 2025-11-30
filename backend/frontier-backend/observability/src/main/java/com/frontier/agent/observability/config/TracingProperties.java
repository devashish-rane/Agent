package com.frontier.agent.observability.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "frontier.tracing")
public class TracingProperties {

    /**
     * Zipkin or AWS X-Ray collector endpoint. Defaults to local dev endpoint so that
     * misconfigurations do not cause startup failures.
     */
    private String zipkinEndpoint = "http://localhost:9411/api/v2/spans";

    public String getZipkinEndpoint() {
        return zipkinEndpoint;
    }

    public void setZipkinEndpoint(String zipkinEndpoint) {
        this.zipkinEndpoint = zipkinEndpoint;
    }
}
