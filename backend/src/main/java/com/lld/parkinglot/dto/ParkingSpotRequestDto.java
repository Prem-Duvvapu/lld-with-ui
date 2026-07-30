package com.lld.parkinglot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParkingSpotRequestDto {

    @NotNull(message = "Gate ID cannot be null")
    @NotBlank(message = "Gate ID cannot be blank")
    private String gateId;

    @NotNull(message = "Vehicle number cannot be null")
    @NotBlank(message = "Vehicle number cannot be blank")
    private String vehicleNumber;

    @NotNull(message = "Vehicle type cannot be null")
    @NotBlank(message = "Vehicle type cannot be blank")
    private String vehicleType;

    private String strategy;

    public ParkingSpotRequestDto(String gateId, String vehicleNumber, String vehicleType) {
        this(gateId, vehicleNumber, vehicleType, "NEAREST");
    }
}
