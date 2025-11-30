package com.frontier.agent.worker.config;

import io.awspring.cloud.sqs.support.converter.SqsMessagingMessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;

@Configuration
public class SqsConfig {

    @Bean
    @ConditionalOnMissingBean
    public SqsMessagingMessageConverter messageConverter() {
        MappingJackson2MessageConverter delegate = new MappingJackson2MessageConverter();
        delegate.setStrictContentTypeMatch(false);
        return new SqsMessagingMessageConverter(delegate);
    }
}
