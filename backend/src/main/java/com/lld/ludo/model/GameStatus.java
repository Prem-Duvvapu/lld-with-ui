package com.lld.ludo.model;

/**
 * Overall match lifecycle. {@code createGame} starts a game directly in {@code PLAYING} (there is
 * no lobby/join step in this module — all 4 seats are filled at creation) — {@code WAITING} is
 * kept for API symmetry with other board-game modules but is never assigned.
 */
public enum GameStatus {
    WAITING, PLAYING, FINISHED
}
