package com.lld.learning.examples.outside;

import com.lld.learning.examples.visibility.VisibilityPeer;
import com.lld.learning.examples.visibility.VisibilityRecord;

public class VisibilityDemo {
    public static void main(String[] args) {
        VisibilityRecord record = new VisibilityRecord("A");
        VisibilityChild child = new VisibilityChild("B");
        System.out.println("own: " + record.inspectOwnMembers());
        System.out.println("peer: " + VisibilityPeer.inspect(record));
        System.out.println("child: " + child.ownHint());
        System.out.println("child receiver: " + child.childHint(new VisibilityChild("C")));
        System.out.println("unrelated: " + record.summary());
    }
}
