package com.lld.trafficsignal.config;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.observer.LoggingSignalObserver;
import com.lld.trafficsignal.observer.SignalChangeNotifier;
import com.lld.trafficsignal.service.TrafficSignalService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds one extra demo intersection at boot (the primary one is created eagerly by
 * {@link TrafficSignalService} itself, matching vendingmachine/coffeemachine's pattern of the
 * service owning its main aggregate and an initializer adding demo content around it).
 */
@Component
public class TrafficSignalInitializer implements CommandLineRunner {
    private final TrafficSignalService service;

    public TrafficSignalInitializer(TrafficSignalService service) {
        this.service = service;
    }

    @Override
    public void run(String... args) {
        service.createIntersection("Broadway & 5th Ave", List.of("North", "South", "East", "West"));
        service.simReset();
    }

    /** Builds a 4-way intersection (or however many positions are given), wired to a fresh, isolated notifier. */
    public static Intersection buildFourWayIntersection(int id, String name, List<String> positions) {
        List<TrafficLight> lights = new ArrayList<>();
        for (int i = 0; i < positions.size(); i++) {
            lights.add(new TrafficLight(i, positions.get(i)));
        }
        SignalChangeNotifier notifier = new SignalChangeNotifier();
        notifier.registerObserver(new LoggingSignalObserver());
        return new Intersection(id, name, lights, notifier);
    }
}
