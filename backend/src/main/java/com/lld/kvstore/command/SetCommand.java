package com.lld.kvstore.command;

import com.lld.kvstore.model.KvEntry;

import java.util.Map;

/**
 * Carries the exact version and expiry this SET (or winning CAS) produced when it was first
 * applied, rather than recomputing them at replay time — replay is then a pure "set state to
 * exactly this" operation, with no dependency on the order or presence of any other command.
 */
public class SetCommand implements Command {

    private final String key;
    private final String value;
    private final Long expiresAtEpoch;
    private final long version;

    public SetCommand(String key, String value, Long expiresAtEpoch, long version) {
        this.key = key;
        this.value = value;
        this.expiresAtEpoch = expiresAtEpoch;
        this.version = version;
    }

    @Override
    public void apply(Map<String, KvEntry> state) {
        state.put(key, KvEntry.builder().value(value).version(version).expiresAtEpoch(expiresAtEpoch).build());
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    public long getVersion() {
        return version;
    }
}
