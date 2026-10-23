package com.lld.learning.examples.visibility;

public final class VisibilityPeer {
    public static String inspect(VisibilityRecord record) {
        return record.summary() + "; " + record.subclassHint() + "; " + record.packageHint();
    }
}
