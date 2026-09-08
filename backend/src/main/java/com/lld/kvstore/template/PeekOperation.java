package com.lld.kvstore.template;

import com.lld.kvstore.model.KvEntry;

import java.util.Optional;

/** Non-throwing counterpart to {@link GetOperation} — used where a miss is a normal outcome. */
public class PeekOperation extends KvReadTemplate<Optional<KvEntry>> {

    @Override
    protected Optional<KvEntry> onMissing(String key) {
        return Optional.empty();
    }

    @Override
    protected Optional<KvEntry> onFound(KvEntry entry) {
        return Optional.of(entry);
    }
}
