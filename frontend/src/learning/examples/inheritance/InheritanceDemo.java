package com.lld.learning.examples.inheritance;

import java.util.ArrayList;
import java.util.List;

public class InheritanceDemo {
    public static String present(InheritanceResource resource) {
        return resource.describe();
    }

    public static void main(String[] args) {
        List<String> trace = new ArrayList<>();
        InheritanceResource plain = new InheritanceResource("Objects", trace);
        InheritanceVideo video = new InheritanceVideo(" Inheritance ", 12, trace);
        InheritanceResource resource = video;
        trace.forEach(System.out::println);
        System.out.println("inherited title: " + resource.getTitle());
        System.out.println("plain: " + present(plain));
        System.out.println("video: " + present(resource));
        System.out.println("same object: " + (resource == video));
        InheritancePlaylist playlist = new InheritancePlaylist(resource);
        System.out.println(playlist.describeNext());
    }
}
