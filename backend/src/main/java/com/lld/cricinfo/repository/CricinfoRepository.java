package com.lld.cricinfo.repository;

import com.lld.cricinfo.model.Match;
import com.lld.cricinfo.model.Team;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Repository
public class CricinfoRepository {

    private final Map<String, Match> matches = new ConcurrentHashMap<>();
    private final Map<String, Team> teams = new ConcurrentHashMap<>();
    private final AtomicInteger matchCounter = new AtomicInteger(100);

    public String generateMatchId() {
        return "MATCH-" + matchCounter.incrementAndGet();
    }

    public void saveMatch(Match match) {
        matches.put(match.getId(), match);
    }

    public Match getMatch(String id) {
        return matches.get(id);
    }

    public List<Match> getAllMatches() {
        return matches.values().stream()
                .sorted(Comparator.comparing(Match::getCreatedAt).reversed())
                .toList();
    }

    public void saveTeam(Team team) {
        teams.put(team.getId(), team);
    }

    public Team getTeam(String id) {
        return teams.get(id);
    }

    public List<Team> getAllTeams() {
        return new ArrayList<>(teams.values());
    }

    public void clear() {
        matches.clear();
        teams.clear();
        matchCounter.set(100);
    }
}
