package com.lld.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI lldOpenAPI(@Value("${server.port}") String serverPort) {
        return new OpenAPI()
                .info(new Info()
                        .title("LLD with UI — Interactive API Documentation")
                        .description("Comprehensive Swagger / OpenAPI documentation for all Low-Level Design modules in the portfolio (Splitwise, Parking Lot, Movie Ticket, ATM, Coffee Machine, Vending Machine, Uber, Zomato, Elevator, Shopping Cart, Stock Brokerage, LinkedIn, Library, PubSub, TicTacToe, etc.).")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Prem Duvvapu")
                                .url("https://github.com/Prem-Duvvapu/lld-with-ui"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("Local Spring Boot Server")
                ));
    }
}
