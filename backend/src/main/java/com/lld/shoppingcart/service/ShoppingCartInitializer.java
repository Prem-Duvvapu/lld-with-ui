package com.lld.shoppingcart.service;

import com.lld.shoppingcart.model.Category;
import com.lld.shoppingcart.model.Product;
import com.lld.shoppingcart.model.User;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ShoppingCartInitializer implements CommandLineRunner {

    private final ShoppingCartService shoppingCartService;

    public ShoppingCartInitializer(ShoppingCartService shoppingCartService) {
        this.shoppingCartService = shoppingCartService;
    }

    @Override
    public void run(String... args) {
        // Seed users
        shoppingCartService.registerUser(new User("u-alice", "Alice Smith", "alice@example.com", "123 Tech Park, Bangalore"));
        shoppingCartService.registerUser(new User("u-bob", "Bob Jones", "bob@example.com", "456 Cyber City, Hyderabad"));
        shoppingCartService.registerUser(new User("u-charlie", "Charlie Brown", "charlie@example.com", "789 MG Road, Mumbai"));

        // Seed catalog
        shoppingCartService.addProduct(new Product("P101", "Apple MacBook Pro M3", Category.ELECTRONICS, 169900.0, 5));
        shoppingCartService.addProduct(new Product("P102", "Sony WH-1000XM5 Headphones", Category.ELECTRONICS, 29990.0, 12));
        shoppingCartService.addProduct(new Product("P103", "Nike Air Force 1 Sneakers", Category.FASHION, 8995.0, 10));
        shoppingCartService.addProduct(new Product("P104", "Nespresso Coffee Maker", Category.HOME_KITCHEN, 14990.0, 8));
        shoppingCartService.addProduct(new Product("P105", "Designing Data-Intensive Applications", Category.BOOKS, 1499.0, 25));
        shoppingCartService.addProduct(new Product("P106", "Gaming Chair Ergonomic", Category.HOME_KITCHEN, 18999.0, 4));

        // Initial cart setup for Alice
        shoppingCartService.addToCart("u-alice", "P102", 1);
        shoppingCartService.addToCart("u-alice", "P105", 2);
    }
}
