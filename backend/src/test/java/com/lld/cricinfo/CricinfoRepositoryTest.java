package com.lld.cricinfo;

import com.lld.cricinfo.model.Match;
import com.lld.cricinfo.model.Team;
import com.lld.cricinfo.repository.CricinfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CricinfoRepository — in-memory storage")
class CricinfoRepositoryTest {

    @Test
    void generateMatchId_isUnique() {
        CricinfoRepository repo = new CricinfoRepository();
        String id1 = repo.generateMatchId();
        String id2 = repo.generateMatchId();
        assertNotEquals(id1, id2);
    }

    @Test
    void saveAndGetMatch_roundTrips() {
        CricinfoRepository repo = new CricinfoRepository();
        Match match = Match.builder().id("M-1").build();
        repo.saveMatch(match);
        assertSame(match, repo.getMatch("M-1"));
        assertNull(repo.getMatch("MISSING"));
    }

    @Test
    void getAllMatches_sortedNewestFirst() throws InterruptedException {
        CricinfoRepository repo = new CricinfoRepository();
        Match first = Match.builder().id("M-1").createdAt(LocalDateTime.now()).build();
        repo.saveMatch(first);
        Thread.sleep(5);
        Match second = Match.builder().id("M-2").createdAt(LocalDateTime.now()).build();
        repo.saveMatch(second);

        var all = repo.getAllMatches();
        assertEquals("M-2", all.get(0).getId());
        assertEquals("M-1", all.get(1).getId());
    }

    @Test
    void saveAndGetTeam_roundTrips() {
        CricinfoRepository repo = new CricinfoRepository();
        Team team = Team.builder().id("T-1").name("Test XI").build();
        repo.saveTeam(team);
        assertSame(team, repo.getTeam("T-1"));
        assertEquals(1, repo.getAllTeams().size());
    }

    @Test
    void clear_removesEverything() {
        CricinfoRepository repo = new CricinfoRepository();
        repo.saveMatch(Match.builder().id("M-1").build());
        repo.saveTeam(Team.builder().id("T-1").build());
        repo.clear();
        assertTrue(repo.getAllMatches().isEmpty());
        assertTrue(repo.getAllTeams().isEmpty());
    }
}
