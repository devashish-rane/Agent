package com.frontier.agent.domain.vector;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Minimal pgvector adapter that stores float[] as a Postgres {@code vector} column. The
 * converter is intentionally defensive: if the driver cannot map the custom type the
 * converter falls back to a text representation to avoid deployment failures when
 * pgvector is not yet installed in lower environments.
 */
@Converter(autoApply = false)
public class FloatArrayVectorConverter implements AttributeConverter<float[], Object> {

    private static final Logger log = LoggerFactory.getLogger(FloatArrayVectorConverter.class);

    @Override
    public Object convertToDatabaseColumn(float[] attribute) {
        if (attribute == null) {
            return null;
        }
        return Arrays.toString(attribute);
    }

    @Override
    public float[] convertToEntityAttribute(Object dbData) {
        if (dbData == null) {
            return null;
        }
        if (dbData instanceof float[] floats) {
            return floats;
        }
        var sanitized = dbData.toString().replaceAll("[\\[\\] ]", "");
        var parts = sanitized.split(",");
        var result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            try {
                result[i] = Float.parseFloat(parts[i]);
            } catch (NumberFormatException ex) {
                log.warn("Failed to parse vector component '{}', defaulting to zero", parts[i]);
            }
        }
        return result;
    }
}
