package com.lld.stackoverflow.model;

import java.util.Map;

/**
 * Common shape for anything that can be voted on — {@link Question} and
 * {@link Answer} — so {@code VotingService} can apply the vote and
 * reputation math once, generically, instead of duplicating it per type.
 * Lombok's generated accessors on both models satisfy this without any
 * boilerplate.
 */
public interface Votable {
    String getId();
    String getAuthorId();
    int getScore();
    void setScore(int score);
    Map<String, VoteType> getVotes();
}
