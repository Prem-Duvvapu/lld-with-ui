package com.lld.kvstore.repository;

import com.lld.kvstore.command.Command;
import com.lld.kvstore.model.KvEntry;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * An append-only log of every successful write, replayable against an empty map to rebuild
 * identical state from nothing — the durability story {@code /sim/reset} demonstrates.
 * {@link CopyOnWriteArrayList} is the right shape here: appends are rare relative to reads
 * (replay, snapshot listing), and appends never need to observe each other's ordering beyond
 * "happens after" — which the underlying {@code ConcurrentHashMap#compute} call that always
 * precedes an append already guarantees for the entry it produced.
 */
public class WriteAheadLog {

    private final List<Command> commands = new CopyOnWriteArrayList<>();

    public void append(Command command) {
        commands.add(command);
    }

    public void replay(Map<String, KvEntry> state) {
        for (Command command : commands) {
            command.apply(state);
        }
    }

    public List<Command> getCommands() {
        return new ArrayList<>(commands);
    }

    public int size() {
        return commands.size();
    }

    public void clear() {
        commands.clear();
    }
}
