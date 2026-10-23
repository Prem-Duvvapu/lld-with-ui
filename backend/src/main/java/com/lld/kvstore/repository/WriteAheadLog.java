package com.lld.kvstore.repository;

import com.lld.kvstore.command.Command;
import com.lld.kvstore.model.KvEntry;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * An append-only log of every successful write, replayable against an empty map to rebuild
 * state in recorded command order. The list is in memory and does not survive a restart.
 * {@link CopyOnWriteArrayList} provides safe list access for appends and replay snapshots;
 * it does not make a map update and its later log append one atomic operation, nor establish
 * a concurrent execution order across those separate operations.
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
