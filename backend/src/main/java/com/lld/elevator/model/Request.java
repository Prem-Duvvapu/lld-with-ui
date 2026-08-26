package com.lld.elevator.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Request {

    private long id;
    private int sourceFloor;
    private int destinationFloor;
    private Direction direction;
    @Builder.Default
    private RequestType type = RequestType.EXTERNAL;
    @Builder.Default
    private String status = "PENDING";
    private long assignedElevatorId;
    @Builder.Default
    private long timestampEpoch = System.currentTimeMillis();
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /** Builds a fresh EXTERNAL request, deriving {@link Direction} from source vs. destination. */
    public static Request of(int sourceFloor, int destinationFloor) {
        return Request.builder()
                .sourceFloor(sourceFloor)
                .destinationFloor(destinationFloor)
                .direction(sourceFloor < destinationFloor ? Direction.UP : Direction.DOWN)
                .build();
    }
}
