package com.zomato.config;

import com.zomato.model.DeliveryPartner;
import com.zomato.model.MenuItem;
import com.zomato.model.Restaurant;
import com.zomato.repository.ZomatoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ZomatoInitializer implements CommandLineRunner {

    private final ZomatoRepository repository;

    public ZomatoInitializer(ZomatoRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        Restaurant r1 = new Restaurant("R1", "Pizza Paradise", "Italian", 4.5, "Downtown",
                List.of(
                        new MenuItem("M1", "Margherita Pizza", 299, "Pizza"),
                        new MenuItem("M2", "Pepperoni Pizza", 399, "Pizza"),
                        new MenuItem("M3", "Garlic Bread", 149, "Sides"),
                        new MenuItem("M4", "Pasta Alfredo", 249, "Pasta"),
                        new MenuItem("M5", "Tiramisu", 199, "Dessert")
                ));

        Restaurant r2 = new Restaurant("R2", "Burger Hub", "American", 4.2, "Mall Road",
                List.of(
                        new MenuItem("M6", "Classic Burger", 199, "Burger"),
                        new MenuItem("M7", "Cheese Burger", 249, "Burger"),
                        new MenuItem("M8", "French Fries", 99, "Sides"),
                        new MenuItem("M9", "Chicken Wrap", 179, "Wraps"),
                        new MenuItem("M10", "Milkshake", 149, "Beverages")
                ));

        Restaurant r3 = new Restaurant("R3", "Biryani House", "Indian", 4.7, "Sector 12",
                List.of(
                        new MenuItem("M11", "Chicken Biryani", 299, "Biryani"),
                        new MenuItem("M12", "Mutton Biryani", 399, "Biryani"),
                        new MenuItem("M13", "Veg Biryani", 249, "Biryani"),
                        new MenuItem("M14", "Raita", 49, "Sides"),
                        new MenuItem("M15", "Gulab Jamun", 99, "Dessert")
                ));

        repository.addRestaurant(r1);
        repository.addRestaurant(r2);
        repository.addRestaurant(r3);

        repository.addDeliveryPartner(new DeliveryPartner("DP1", "Rahul", "9876543210"));
        repository.addDeliveryPartner(new DeliveryPartner("DP2", "Priya", "9876543211"));
        repository.addDeliveryPartner(new DeliveryPartner("DP3", "Amit", "9876543212"));
    }
}
