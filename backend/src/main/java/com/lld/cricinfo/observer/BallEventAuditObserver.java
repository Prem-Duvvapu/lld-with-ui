package com.lld.cricinfo.observer;

import com.lld.cricinfo.model.Ball;
import com.lld.cricinfo.model.CricinfoEvent;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Fourth observer: a lightweight audit trail of every ball, independent of
 * scoring/commentary — feeds the /sim telemetry stream, mirroring
 * splitwise's event log / zomato's ZomatoEvent idiom.
 */
@Component
public class BallEventAuditObserver implements BallEventObserver {

    private final List<CricinfoEvent> events = new CopyOnWriteArrayList<>();
    private final AtomicLong sequence = new AtomicLong(0);

    @Override
    public void onBallBowled(BallEvent event) {
        Ball ball = event.ball();
        events.add(CricinfoEvent.builder()
                .sequence(sequence.incrementAndGet())
                .type("BALL_BOWLED")
                .matchId(event.match().getId())
                .message("Over " + ball.getOverNumber() + "." + ball.getBallInOver()
                        + ": " + ball.totalRuns() + " run(s)" + (ball.isWicket() ? ", WICKET" : ""))
                .detail(Map.of(
                        "inningsIndex", event.innings().getIndex(),
                        "runs", ball.totalRuns(),
                        "wicket", ball.isWicket()
                ))
                .build());
    }

    public List<CricinfoEvent> getEvents() {
        return List.copyOf(events);
    }

    public List<CricinfoEvent> getEventsForMatch(String matchId) {
        return events.stream().filter(e -> e.getMatchId().equals(matchId)).toList();
    }

    public void clear() {
        events.clear();
    }

    @Override
    public String getObserverName() {
        return "BallAudit";
    }
}
