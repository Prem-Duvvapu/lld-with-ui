package com.lld.learning.examples.aggregation;

import java.util.List;

public final class AggregationDemo {
    public static void main(String[] args) {
        Track dawn = new Track("Dawn");
        Playlist focus = new Playlist("Focus");
        Playlist commute = new Playlist("Commute");
        System.out.println("Before: " + focus.getTracks().size() + "/" + commute.getTracks().size());

        focus.add(dawn);
        commute.add(dawn);
        List<Track> saved = focus.getTracks();
        System.out.println("Shared identity: " + (focus.getTracks().get(0) == commute.getTracks().get(0)));

        dawn.rename("Sunrise");
        System.out.println("Shared title: " + focus.getTracks().get(0).getTitle()
                + "/" + commute.getTracks().get(0).getTitle());
        try {
            focus.add(dawn);
        } catch (IllegalArgumentException rejected) {
            System.out.println("Duplicate: " + rejected.getMessage());
        }

        System.out.println("Removed from Focus: " + focus.remove(dawn));
        System.out.println("Membership: " + focus.getTracks().size() + "/" + commute.getTracks().size());
        focus.delete();
        System.out.println("Focus deleted: " + focus.isDeleted());
        System.out.println("Catalog track: " + dawn.getTitle());
        System.out.println("Saved membership: " + saved.size() + ", same track: " + (saved.get(0) == dawn));
        System.out.println("Commute still plays: " + commute.getTracks().get(0).getTitle());
    }
}
