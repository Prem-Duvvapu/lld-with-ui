package com.lld.stackoverflow.model;

/**
 * A question's lifecycle. {@code OPEN} accepts new answers and votes as
 * normal; {@code ANSWERED} means an answer has been accepted (new answers are
 * still welcome); {@code CLOSED} rejects new answers outright — the author
 * (or a moderator, in a fuller build) has decided the question is done.
 */
public enum QuestionStatus {
    OPEN,
    ANSWERED,
    CLOSED
}
