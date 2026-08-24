package com.lld.chess.strategy;

import com.lld.chess.model.PieceType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/** Resolves the movement-rule strategy for a piece type, so the service never switches on type. */
@Component
public class PieceMoveStrategyFactory {

    private final Map<PieceType, PieceMoveStrategy> strategies = new EnumMap<>(PieceType.class);

    public PieceMoveStrategyFactory(List<PieceMoveStrategy> allStrategies) {
        for (PieceMoveStrategy strategy : allStrategies) {
            strategies.put(strategy.type(), strategy);
        }
    }

    public PieceMoveStrategy forType(PieceType type) {
        PieceMoveStrategy strategy = strategies.get(type);
        if (strategy == null) throw new IllegalStateException("No move strategy registered for " + type);
        return strategy;
    }
}
