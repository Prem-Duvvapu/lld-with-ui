package com.lld.kvstore.command;

import com.lld.kvstore.model.KvEntry;

import java.util.Map;

public class DeleteCommand implements Command {

    private final String key;

    public DeleteCommand(String key) {
        this.key = key;
    }

    @Override
    public void apply(Map<String, KvEntry> state) {
        state.remove(key);
    }

    public String getKey() {
        return key;
    }
}
