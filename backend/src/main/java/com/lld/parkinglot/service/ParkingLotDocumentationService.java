package com.lld.parkinglot.service;

import com.lld.parkinglot.dto.ClassDiagramDto;
import com.lld.parkinglot.dto.ClassDiagramDto.ClassInfo;
import com.lld.parkinglot.dto.ClassDiagramDto.RelationshipInfo;
import com.lld.parkinglot.dto.DesignDetailsDto;
import com.lld.parkinglot.dto.DesignDetailsDto.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParkingLotDocumentationService {

    public ClassDiagramDto getClassDiagram() {
        List<ClassInfo> classes = List.of(
            new ClassInfo("ParkingLotService", "singleton",
                List.of("- repository: ParkingLotRepository", "- spotStrategyFactory: SpotAssignmentStrategyFactory", "- pricingStrategyFactory: PricingStrategyFactory"),
                List.of("+ entry(dto): Ticket", "+ scanTicket(gateId, tktNo, strategy): Ticket", "+ payAndExit(gateId, tktNo, strategy, payMethod): Ticket", "+ getActiveTickets(): List<Ticket>")),
            new ClassInfo("Ticket", null,
                List.of("- ticketNumber: String", "- vehicleNumber: String", "- vehicleType: VehicleType", "- spotId: String", "- entryTime: LocalDateTime", "- exitTime: LocalDateTime", "- amount: double", "- paymentStatus: PaymentStatus", "- paymentMethod: String"),
                List.of()),
            new ClassInfo("ParkingSpotRequestDto", "dto",
                List.of("- gateId: String", "- vehicleNumber: String", "- vehicleType: String", "- strategy: String"),
                List.of("+ getGateId()", "+ getVehicleNumber()", "+ getVehicleType()", "+ getStrategy()")),
            new ClassInfo("ParkingSpot", null,
                List.of("- id: String", "- floorNumber: int", "- spotNumber: int", "- vehicleType: VehicleType", "- occupied: boolean"),
                List.of("+ isOccupied(): boolean", "+ setOccupied(b): void")),
            new ClassInfo("Floor", null,
                List.of("- floorNumber: int", "- spots: List<ParkingSpot>"),
                List.of()),
            new ClassInfo("Gate", null,
                List.of("- id: String", "- name: String", "- type: GateType (ENTRY/EXIT)"),
                List.of()),
            new ClassInfo("VehicleType", "enum",
                List.of("CAR", "BIKE", "TRUCK"),
                List.of()),
            new ClassInfo("PaymentStatus", "enum",
                List.of("UNPAID", "PAID"),
                List.of()),
            new ClassInfo("ParkingLotRepository", null,
                List.of("- floors: Map<String, Floor>", "- spots: ConcurrentHashMap<String, ParkingSpot>", "- tickets: ConcurrentHashMap<String, Ticket>", "- spotLock: ReentrantLock", "- ticketLock: ReentrantLock"),
                List.of("+ occupySpot(type, strategy): ParkingSpot", "+ releaseSpot(spotId): void", "+ generateTicketNumber(): String")),
            new ClassInfo("SpotAssignmentStrategy", "interface",
                List.of(),
                List.of("+ findSpot(spots, vehicleType): ParkingSpot")),
            new ClassInfo("NearestSpotStrategy", null,
                List.of("implements SpotAssignmentStrategy"),
                List.of("+ findSpot(spots, vehicleType): ParkingSpot")),
            new ClassInfo("FarthestSpotStrategy", null,
                List.of("implements SpotAssignmentStrategy"),
                List.of("+ findSpot(spots, vehicleType): ParkingSpot")),
            new ClassInfo("SpotAssignmentStrategyFactory", null,
                List.of("- strategies: Map<String, SpotAssignmentStrategy>"),
                List.of("+ getStrategy(name): SpotAssignmentStrategy")),
            new ClassInfo("PricingStrategy", "interface",
                List.of(),
                List.of("+ calculatePrice(ticket): double")),
            new ClassInfo("HourlyPricingStrategy", null,
                List.of("implements PricingStrategy"),
                List.of("+ calculatePrice(ticket): double")),
            new ClassInfo("FlatRatePricingStrategy", null,
                List.of("implements PricingStrategy"),
                List.of("+ calculatePrice(ticket): double")),
            new ClassInfo("DynamicPricingStrategy", null,
                List.of("implements PricingStrategy", "- baseStrategy: HourlyPricingStrategy"),
                List.of("+ calculatePrice(ticket): double")),
            new ClassInfo("PricingStrategyFactory", null,
                List.of("- strategies: Map<String, PricingStrategy>"),
                List.of("+ getStrategy(name): PricingStrategy"))
        );

        List<RelationshipInfo> relationships = List.of(
            new RelationshipInfo("ParkingLotService", "ParkingLotRepository", "uses", false),
            new RelationshipInfo("ParkingLotService", "SpotAssignmentStrategyFactory", "uses", false),
            new RelationshipInfo("ParkingLotService", "PricingStrategyFactory", "uses", false),
            new RelationshipInfo("ParkingLotService", "Ticket", "creates & updates", false),
            new RelationshipInfo("ParkingLotService", "ParkingSpotRequestDto", "validates", false),
            new RelationshipInfo("ParkingLotRepository", "Floor", "contains", false),
            new RelationshipInfo("Floor", "ParkingSpot", "contains", false),
            new RelationshipInfo("Ticket", "ParkingSpot", "references", false),
            new RelationshipInfo("Ticket", "VehicleType", "uses", false),
            new RelationshipInfo("Ticket", "PaymentStatus", "has status", false),
            new RelationshipInfo("ParkingSpot", "VehicleType", "uses", false),
            new RelationshipInfo("NearestSpotStrategy", "SpotAssignmentStrategy", "implements", true),
            new RelationshipInfo("FarthestSpotStrategy", "SpotAssignmentStrategy", "implements", true),
            new RelationshipInfo("HourlyPricingStrategy", "PricingStrategy", "implements", true),
            new RelationshipInfo("FlatRatePricingStrategy", "PricingStrategy", "implements", true),
            new RelationshipInfo("DynamicPricingStrategy", "PricingStrategy", "implements", true),
            new RelationshipInfo("SpotAssignmentStrategyFactory", "SpotAssignmentStrategy", "creates", false),
            new RelationshipInfo("PricingStrategyFactory", "PricingStrategy", "creates", false)
        );

        return new ClassDiagramDto("Parking Lot — Class Diagram (Served via Backend API)", classes, relationships);
    }

    public DesignDetailsDto getDesignDetails() {
        List<String> requirements = List.of(
            "Multi-floor parking lot with 3 types of spots: CAR (12), BIKE (12), TRUCK (6) — 30 spots total across 3 floors",
            "Multiple gates: G1/G2 (Entry), G3/G4 (Exit) — vehicles can only enter through entry gates and exit through exit gates",
            "Vehicle entry: driver enters through an entry gate → selects spot strategy (Nearest / Farthest) → system assigns spot and issues ticket",
            "Multi-step Vehicle exit: Step 1: Scan ticket & calculate price preview (UNPAID, spot retained) → Step 2: Select payment method (UPI, CARD, CASH) & pay → ticket marked PAID & spot released",
            "Extensible Pricing Strategies: HourlyPricingStrategy (CAR ₹20/hr, BIKE ₹10/hr, TRUCK ₹40/hr), FlatRatePricingStrategy (Flat rates), DynamicPricingStrategy (1.5x surge rate)",
            "Extensible Spot Assignment Strategies: NearestSpotStrategy (lowest floor & spot ID) vs FarthestSpotStrategy (highest floor & spot ID)",
            "Real-time spot availability tracking via concurrent-safe data structures",
            "Thread-safe concurrent access — fine-grained ReentrantLock (spotLock and ticketLock) ensures zero race conditions or double bookings"
        );

        List<EntityInfo> entities = List.of(
            new EntityInfo("ParkingLotService", "Core business logic layer. Handles entry (assign spot + create ticket) and multi-step exit (scan preview + process payment & release spot). Uses Strategy Factories for spot allocation & pricing.",
                List.of(
                    new FieldInfo("repository", "ParkingLotRepository", null, "Data access layer injected via Spring @Autowired"),
                    new FieldInfo("spotStrategyFactory", "SpotAssignmentStrategyFactory", null, "Factory resolving spot assignment strategy ('NEAREST', 'FARTHEST')"),
                    new FieldInfo("pricingStrategyFactory", "PricingStrategyFactory", null, "Factory resolving pricing strategy ('HOURLY', 'FLAT', 'DYNAMIC')")
                ),
                List.of(
                    new MethodInfo("entry(dto)", "Ticket", "Validates gate → finds spot via selected SpotAssignmentStrategy → generates ticket → saves"),
                    new MethodInfo("scanTicket(gateId, ticketNumber, pricingStrategyName)", "Ticket", "Validates exit gate & ticket → computes preview charge (UNPAID) without releasing spot"),
                    new MethodInfo("payAndExit(gateId, ticketNumber, pricingStrategyName, paymentMethod)", "Ticket", "Validates exit gate & ticket → calculates final charge → sets PAID & paymentMethod → releases spot"),
                    new MethodInfo("getGates()", "List<Gate>", "Returns all configured gates"),
                    new MethodInfo("getFloors()", "List<Floor>", "Returns all floors with their spots"),
                    new MethodInfo("getActiveTickets()", "List<Ticket>", "Returns all tickets with no exit time")
                )
            ),
            new EntityInfo("SpotAssignmentStrategyFactory", "Factory registry for spot assignment strategies. Resolves strategy instances dynamically based on strategy name ('NEAREST' vs 'FARTHEST').",
                List.of(new FieldInfo("strategies", "Map<String, SpotAssignmentStrategy>", null, "Map of strategy implementations keyed by uppercase name")),
                List.of(new MethodInfo("getStrategy(strategyName)", "SpotAssignmentStrategy", "Returns requested strategy implementation, defaulting to NEAREST if omitted"))
            ),
            new EntityInfo("PricingStrategyFactory", "Factory registry for ticket pricing strategies. Resolves pricing strategy instances dynamically based on strategy name ('HOURLY', 'FLAT', 'DYNAMIC').",
                List.of(new FieldInfo("strategies", "Map<String, PricingStrategy>", null, "Map of pricing strategy implementations keyed by uppercase name")),
                List.of(new MethodInfo("getStrategy(strategyName)", "PricingStrategy", "Returns requested pricing strategy implementation, defaulting to HOURLY if omitted"))
            ),
            new EntityInfo("ParkingLotRepository", "In-memory data store using ConcurrentHashMap and fine-grained ReentrantLocks for thread safety. Single source of truth for all parking lot state.",
                List.of(
                    new FieldInfo("floors", "Map<String, Floor>", null, "LinkedHashMap — preserves insertion order of floors"),
                    new FieldInfo("spots", "ConcurrentHashMap<String, ParkingSpot>", null, "All spots indexed by ID for O(1) lookup"),
                    new FieldInfo("tickets", "ConcurrentHashMap<String, Ticket>", null, "All tickets indexed by ticket number"),
                    new FieldInfo("spotLock", "ReentrantLock", null, "Ensures atomic spot occupy/release operations without contention"),
                    new FieldInfo("ticketLock", "ReentrantLock", null, "Ensures unique atomic ticket number generation")
                ),
                List.of(
                    new MethodInfo("occupySpot(vehicleType, strategy)", "ParkingSpot", "Finds & marks available spot of given type using strategy — thread safe via spotLock"),
                    new MethodInfo("releaseSpot(spotId)", "void", "Marks spot as available — thread safe via spotLock"),
                    new MethodInfo("generateTicketNumber()", "String", "Atomic counter — produces 'TKT-00001' format via ticketLock")
                )
            ),
            new EntityInfo("Ticket", "Value object representing a parking session. Created on entry, previewed on scan, finalized on payment & exit.",
                List.of(
                    new FieldInfo("ticketNumber", "String", null, "Unique identifier (auto-generated), e.g. TKT-00001"),
                    new FieldInfo("vehicleNumber", "String", null, "License plate of the vehicle, e.g. KA-01-AB-1234"),
                    new FieldInfo("vehicleType", "VehicleType", null, "CAR, BIKE, or TRUCK — determines spot & base rate"),
                    new FieldInfo("spotId", "String", null, "Assigned parking spot ID, e.g. F1-C2"),
                    new FieldInfo("paymentStatus", "PaymentStatus", null, "UNPAID on scan preview, PAID on exit payment"),
                    new FieldInfo("paymentMethod", "String", null, "UPI, CARD, or CASH — recorded on payment")
                ),
                List.of()
            )
        );

        List<PatternInfo> designPatterns = List.of(
            new PatternInfo("Strategy Pattern", true, "Fully implemented Strategy pattern for both Parking Spot Assignment (NearestSpotStrategy, FarthestSpotStrategy) and Ticket Pricing (HourlyPricingStrategy, FlatRatePricingStrategy, DynamicPricingStrategy). Strategies are selected dynamically at runtime without modifying service code (Open/Closed Principle)."),
            new PatternInfo("Factory Pattern", true, "SpotAssignmentStrategyFactory and PricingStrategyFactory encapsulate creation and lookup of strategy implementations based on request parameters."),
            new PatternInfo("Repository Pattern", true, "ParkingLotRepository abstracts data access and concurrency locking away from the service layer, keeping business logic clean and testable."),
            new PatternInfo("Singleton Pattern", true, "Spring @Service, @Repository, and Strategy Factories operate as singletons to maintain a single consistent state across all requests."),
            new PatternInfo("Dependency Injection (IoC)", true, "Services receive repository and strategy factories via Spring @Autowired constructor injection, maximizing decoupling and testability.")
        );

        List<PrincipleInfo> principles = List.of(
            new PrincipleInfo("Single Responsibility (SRP)", "Each class has exactly one reason to change. ParkingLotService handles workflow orchestration. ParkingLotRepository handles thread-safe data storage. Pricing strategies handle fare calculation. Spot strategies handle spot selection."),
            new PrincipleInfo("Open/Closed (OCP)", "Adding a new pricing model or spot selection strategy requires creating a new Strategy class without modifying existing service code."),
            new PrincipleInfo("Dependency Inversion (DIP)", "High-level ParkingLotService depends on Strategy and Repository interfaces, injected at runtime by Spring Container.")
        );

        List<OopInfo> oopConcepts = List.of(
            new OopInfo("Strategy & Factory Polymorphism", "SpotAssignmentStrategy and PricingStrategy implementations are polymorphically selected by Factories based on string identifiers.", "Could use hardcoded switch/case blocks inside service. Strategy + Factory pattern is chosen for extensible, maintainable code."),
            new OopInfo("Encapsulation & Data Hiding", "ParkingLotRepository wraps internal ConcurrentHashMaps behind semantic methods like occupySpot() and releaseSpot() guarded by ReentrantLocks.", "Direct map access is avoided to prevent thread safety bugs.")
        );

        List<ExtensibilityInfo> extensibility = List.of(
            new ExtensibilityInfo("New Pricing Strategies", "Implement PricingStrategy interface (e.g. WeekendSurgeStrategy) and register it in PricingStrategyFactory.", "Easy"),
            new ExtensibilityInfo("Database Persistence", "Implement a JPA Repository implementing the same repository interface and annotate with @Primary or Spring @Profile.", "Medium")
        );

        return new DesignDetailsDto("Parking Lot — Design Details (Served via Backend API)", requirements, entities, designPatterns, principles, oopConcepts, extensibility);
    }
}
