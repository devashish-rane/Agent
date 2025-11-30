package com.frontier.agent.clients.aws;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "frontier.aws")
public class AwsClientProperties {

    private String region = "us-east-1";
    private URI endpointOverride;

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public URI getEndpointOverride() {
        return endpointOverride;
    }

    public void setEndpointOverride(URI endpointOverride) {
        this.endpointOverride = endpointOverride;
    }
}
