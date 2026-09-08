package com.lld.kvstore.command;

import com.lld.kvstore.model.KvEntry;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Proves each Command's apply() genuinely mutates raw state deterministically, per RCA-002-style rigor. */
public class CommandTest {

    @Test
    void setCommandWritesTheExactEntryItCarries() {
        Map<String, KvEntry> state = new HashMap<>();
        new SetCommand("a", "1", 5000L, 3).apply(state);

        KvEntry entry = state.get("a");
        assertEquals("1", entry.getValue());
        assertEquals(3, entry.getVersion());
        assertEquals(5000L, entry.getExpiresAtEpoch());
    }

    @Test
    void setCommandOverwritesWhateverWasThereBefore() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("old").version(99).build());

        new SetCommand("a", "new", null, 1).apply(state);

        assertEquals("new", state.get("a").getValue());
        assertEquals(1, state.get("a").getVersion(), "replay must set state to exactly what the command carries, not increment from whatever is already there");
    }

    @Test
    void deleteCommandRemovesTheKey() {
        Map<String, KvEntry> state = new HashMap<>();
        state.put("a", KvEntry.builder().value("1").version(1).build());

        new DeleteCommand("a").apply(state);

        assertFalse(state.containsKey("a"));
    }

    @Test
    void deleteCommandOnAnAlreadyAbsentKeyIsANoOp() {
        Map<String, KvEntry> state = new HashMap<>();

        assertDoesNotThrow(() -> new DeleteCommand("never-existed").apply(state));
        assertTrue(state.isEmpty());
    }
}
