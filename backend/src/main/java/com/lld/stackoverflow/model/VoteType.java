package com.lld.stackoverflow.model;

/** The two directions a vote can go. Fixed set, hence a typed enum rather
 *  than a string literal passed around the service and repository layer. */
public enum VoteType {
    UPVOTE,
    DOWNVOTE
}
