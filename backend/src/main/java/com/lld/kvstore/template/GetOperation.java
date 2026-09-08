package com.lld.kvstore.template;

import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.model.KvEntry;

public class GetOperation extends KvReadTemplate<KvEntry> {

    @Override
    protected KvEntry onMissing(String key) {
        throw new KeyNotFoundException("No entry for key: " + key);
    }

    @Override
    protected KvEntry onFound(KvEntry entry) {
        return entry;
    }
}
