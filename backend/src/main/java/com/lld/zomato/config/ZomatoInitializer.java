package com.lld.zomato.config;

import com.lld.zomato.model.*;
import com.lld.zomato.repository.ZomatoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ZomatoInitializer implements CommandLineRunner {

    private final ZomatoRepository repository;

    public ZomatoInitializer(ZomatoRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        // --- 1. Customers ---
        Customer c1 = new Customer("CUST-101", "Rahul Sharma", "rahul@example.com", "+91 98765 43210", "Apt 4B, Green Glen Layout, Bellandur, Bangalore");
        Customer c2 = new Customer("CUST-102", "Priya Patel", "priya@example.com", "+91 98123 45678", "Flat 202, Sunshine Heights, HSR Layout, Bangalore");
        Customer c3 = new Customer("CUST-103", "Anish Verma", "anish@example.com", "+91 99000 11223", "House #42, Indiranagar 100ft Road, Bangalore");

        repository.saveCustomer(c1);
        repository.saveCustomer(c2);
        repository.saveCustomer(c3);

        // --- 2. Delivery Agents ---
        DeliveryAgent a1 = new DeliveryAgent("AGENT-201", "Ramesh Kumar", "+91 91111 22222", "KA-01-EQ-1234", true);
        DeliveryAgent a2 = new DeliveryAgent("AGENT-202", "Suresh Raina", "+91 93333 44444", "KA-05-MK-5678", true);
        DeliveryAgent a3 = new DeliveryAgent("AGENT-203", "Vikram Singh", "+91 95555 66666", "KA-03-AB-9012", true);

        repository.saveDeliveryAgent(a1);
        repository.saveDeliveryAgent(a2);
        repository.saveDeliveryAgent(a3);

        // --- 3. Restaurants ---
        // Restaurant 1: Spice Garden (Indian North/South)
        List<MenuItem> menu1 = new ArrayList<>();
        menu1.add(new MenuItem("M101", "Paneer Butter Masala", "Rich cottage cheese curry cooked in tomato gravy", 260.0, "Main Course", true, true));
        menu1.add(new MenuItem("M102", "Garlic Naan", "Freshly baked oven naan sprinkled with garlic & butter", 55.0, "Breads", true, true));
        menu1.add(new MenuItem("M103", "Chicken Biryani", "Aromatic basmati rice cooked with spices & tender chicken", 320.0, "Main Course", false, true));
        menu1.add(new MenuItem("M104", "Gulab Jamun (2 pcs)", "Warm milk-solid dumplings soaked in cardamom syrup", 90.0, "Desserts", true, true));
        menu1.add(new MenuItem("M105", "Sweet Lassi", "Traditional churned yogurt beverage flavored with rose", 70.0, "Beverages", true, true));
        Restaurant r1 = new Restaurant("REST-01", "Spice Garden", "Indiranagar, Bangalore", "North Indian, Mughlai", 4.7, menu1);

        // Restaurant 2: Burger House (Fast Food)
        List<MenuItem> menu2 = new ArrayList<>();
        menu2.add(new MenuItem("M201", "Classic Cheese Burger", "Juicy grilled patty topped with melted cheddar & veggies", 199.0, "Burgers", false, true));
        menu2.add(new MenuItem("M202", "Crispy Veg Supreme Burger", "Golden fried veggie patty with spicy mayo sauce", 149.0, "Burgers", true, true));
        menu2.add(new MenuItem("M203", "Peri Peri French Fries", "Crispy golden potato fries tossed in peri peri spice mix", 110.0, "Sides", true, true));
        menu2.add(new MenuItem("M204", "Choco Lava Cake", "Warm chocolate cake with oozing lava center", 120.0, "Desserts", true, true));
        menu2.add(new MenuItem("M205", "Cold Coffee Float", "Creamy blended cold coffee topped with vanilla ice cream", 135.0, "Beverages", true, true));
        Restaurant r2 = new Restaurant("REST-02", "Burger House", "Koramangala 5th Block, Bangalore", "American, Fast Food", 4.5, menu2);

        // Restaurant 3: Pizza Paradise (Italian)
        List<MenuItem> menu3 = new ArrayList<>();
        menu3.add(new MenuItem("M301", "Margherita Gourmet Pizza", "Fresh mozzarella, basil leaves & vine tomatoes", 380.0, "Pizzas", true, true));
        menu3.add(new MenuItem("M302", "BBQ Chicken Feast Pizza", "Smokey BBQ chicken, red onions, paprika & mozzarella", 490.0, "Pizzas", false, true));
        menu3.add(new MenuItem("M303", "Cheesy Garlic Bread", "Toasted baguette topped with garlic butter & melted cheese", 160.0, "Sides", true, true));
        menu3.add(new MenuItem("M304", "Italian Tiramisu", "Classic coffee-infused mascarpone dessert layer", 210.0, "Desserts", true, true));
        Restaurant r3 = new Restaurant("REST-03", "Pizza Paradise", "HSR Layout Sector 1, Bangalore", "Italian, Pizza", 4.8, menu3);

        // Restaurant 4: Sushi Express (Asian)
        List<MenuItem> menu4 = new ArrayList<>();
        menu4.add(new MenuItem("M401", "Salmon Teriyaki Roll", "Fresh salmon, avocado & cucumber with teriyaki glaze", 540.0, "Sushi", false, true));
        menu4.add(new MenuItem("M402", "Veg Tempura Roll", "Crispy fried tempura vegetables with spicy mayonnaise", 390.0, "Sushi", true, true));
        menu4.add(new MenuItem("M403", "Chicken Dimsums (6 pcs)", "Steamed juicy chicken dumplings served with chili dip", 280.0, "Starters", false, true));
        menu4.add(new MenuItem("M404", "Matcha Green Tea Ice Cream", "Authentic Japanese green tea flavored gelato", 180.0, "Desserts", true, true));
        Restaurant r4 = new Restaurant("REST-04", "Sushi Express", "UB City, Vittal Mallya Road, Bangalore", "Japanese, Asian", 4.9, menu4);

        repository.saveRestaurant(r1);
        repository.saveRestaurant(r2);
        repository.saveRestaurant(r3);
        repository.saveRestaurant(r4);

        // --- 4. Sample Seed Order ---
        List<OrderItem> seedItems = new ArrayList<>();
        seedItems.add(new OrderItem("M101", "Paneer Butter Masala", 260.0, 1));
        seedItems.add(new OrderItem("M102", "Garlic Naan", 55.0, 2));

        String orderId = repository.generateOrderId();
        Payment seedPayment = new Payment("PAY-999", orderId, 400.0, PaymentMethod.UPI, PaymentStatus.COMPLETED, "TXN-881920");

        Order seedOrder = new Order(
                orderId, c1.getId(), c1.getName(), c1.getPhone(), c1.getDeliveryAddress(),
                r1.getId(), r1.getName(), seedItems, 370.0, 35.0, 18.5, 423.5,
                seedPayment, "4821"
        );
        seedOrder.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        seedOrder.setDeliveryAgentId(a1.getId());
        seedOrder.setDeliveryAgentName(a1.getName());
        seedOrder.setDeliveryAgentPhone(a1.getPhone());
        a1.setAvailable(false);

        repository.saveOrder(seedOrder);

        repository.saveNotification(new Notification("N-01", "CUSTOMER", c1.getId(), orderId, "Agent Ramesh Kumar is on the way with your order!"));
        repository.saveNotification(new Notification("N-02", "RESTAURANT", r1.getId(), orderId, "Order REST-01 dispatched with Ramesh Kumar."));
    }
}
