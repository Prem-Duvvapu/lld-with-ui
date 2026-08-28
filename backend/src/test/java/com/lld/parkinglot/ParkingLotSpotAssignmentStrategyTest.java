package com.lld.parkinglot;

import com.lld.parkinglot.exception.InvalidParkingRequestException;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.strategy.FarthestSpotStrategy;
import com.lld.parkinglot.strategy.NearestSpotStrategy;
import com.lld.parkinglot.strategy.SpotAssignmentStrategyFactory;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Pins the exact spot-selection logic of every assignment strategy and the factory's resolution. */
class ParkingLotSpotAssignmentStrategyTest {

    private final NearestSpotStrategy nearest = new NearestSpotStrategy();
    private final FarthestSpotStrategy farthest = new FarthestSpotStrategy();
    private final SpotAssignmentStrategyFactory factory = new SpotAssignmentStrategyFactory(nearest, farthest);

    private final List<ParkingSpot> mixedSpots = List.of(
            new ParkingSpot("F2-C3", 2, 3, VehicleType.CAR),
            new ParkingSpot("F1-C1", 1, 1, VehicleType.CAR),
            new ParkingSpot("F3-C2", 3, 2, VehicleType.CAR),
            new ParkingSpot("F1-B1", 1, 1, VehicleType.BIKE)
    );

    @Test
    void nearest_picksLowestFloorThenLowestSpotNumber() {
        ParkingSpot picked = nearest.findSpot(mixedSpots, VehicleType.CAR);
        assertEquals("F1-C1", picked.getId());
    }

    @Test
    void farthest_picksHighestFloorThenHighestSpotNumber() {
        ParkingSpot picked = farthest.findSpot(mixedSpots, VehicleType.CAR);
        assertEquals("F3-C2", picked.getId());
    }

    @Test
    void nearest_ignoresSpotsOfOtherVehicleTypes() {
        ParkingSpot picked = nearest.findSpot(mixedSpots, VehicleType.BIKE);
        assertEquals("F1-B1", picked.getId());
    }

    @Test
    void nearest_ignoresOccupiedSpots() {
        List<ParkingSpot> spots = List.of(
                occupied("F1-C1", 1, 1),
                new ParkingSpot("F1-C2", 1, 2, VehicleType.CAR)
        );
        ParkingSpot picked = nearest.findSpot(spots, VehicleType.CAR);
        assertEquals("F1-C2", picked.getId());
    }

    @Test
    void nearest_returnsNullWhenNoneMatch() {
        assertNull(nearest.findSpot(mixedSpots, VehicleType.TRUCK));
    }

    @Test
    void farthest_returnsNullWhenNoneMatch() {
        assertNull(farthest.findSpot(List.of(), VehicleType.CAR));
    }

    @Test
    void factory_resolvesNearestByName() {
        assertSame(nearest, factory.getStrategy("NEAREST"));
        assertSame(nearest, factory.getStrategy("nearest"));
    }

    @Test
    void factory_resolvesFarthestByName() {
        assertSame(farthest, factory.getStrategy("FARTHEST"));
    }

    @Test
    void factory_defaultsToNearestWhenNameIsNullOrBlank() {
        assertSame(nearest, factory.getStrategy(null));
        assertSame(nearest, factory.getStrategy(""));
    }

    @Test
    void factory_throwsForUnknownStrategyName() {
        assertThrows(InvalidParkingRequestException.class, () -> factory.getStrategy("RANDOM"));
    }

    private ParkingSpot occupied(String id, int floor, int spotNum) {
        ParkingSpot spot = new ParkingSpot(id, floor, spotNum, VehicleType.CAR);
        spot.setOccupied(true);
        return spot;
    }
}
