package com.lld.trafficsignal.observer;

import com.lld.trafficsignal.model.LightState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** One phase change broadcast to every {@link SignalObserver} subscribed to a {@link SignalChangeNotifier}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignalChangeEvent {
    private int intersectionId;
    private int lightId;
    private String position;
    private LightState previousPhase;
    private LightState newPhase;
    private LocalDateTime timestamp;
}
