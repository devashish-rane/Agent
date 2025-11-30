package com.frontier.agent.domain.model;

/**
 * Classification produced by the NoteParserAgent. Keeping this small and explicit
 * avoids schema drift in DynamoDB projections where the type is part of the key.
 */
public enum NoteType {
    NOTE,
    GOAL,
    EVENT,
    TASK,
    JOURNAL
}
