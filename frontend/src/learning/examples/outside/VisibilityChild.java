package com.lld.learning.examples.outside;

import com.lld.learning.examples.visibility.VisibilityRecord;

public final class VisibilityChild extends VisibilityRecord {
    public VisibilityChild(String id) {
        super(id);
    }

    public String ownHint() {
        return subclassHint();
    }

    public String childHint(VisibilityChild other) {
        return other.subclassHint();
    }
}
