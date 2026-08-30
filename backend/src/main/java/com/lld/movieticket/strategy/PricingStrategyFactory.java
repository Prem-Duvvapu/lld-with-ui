package com.lld.movieticket.strategy;

import com.lld.movieticket.model.Show;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link PricingTier} to its strategy via an EnumMap built once — the same shape as
 * {@code inventory.strategy.ReorderStrategyFactory} / splitwise's {@code SplitStrategyFactory}.
 *
 * <p>Before this existed, {@link SurgePricingStrategy} was dead code: {@code MovieTicketService}'s
 * constructor took a concrete {@link BasePricingStrategy} directly, so nothing ever selected the
 * surge strategy — the "Strategy pattern" this module claimed had exactly one strategy actually
 * wired in. {@link #resolve} picks the tier from the show's time slot: a 5 PM or later showtime
 * (evening/prime-time demand) gets {@link SurgePricingStrategy}; everything else — including a
 * showtime this factory can't parse — falls back to {@link BasePricingStrategy}, since defaulting
 * an unparseable slot to a price surcharge would be the more surprising failure mode.
 */
// Explicit bean name: com.lld.parkinglot.strategy.PricingStrategyFactory shares this class's
// simple name, and Spring's component scan derives the same default bean name ("pricingStrategyFactory")
// from either — the whole app context (LldApplication boots all 37 module packages at once) failed
// to start with a ConflictingBeanDefinitionException until this was disambiguated.
@Component("movieTicketPricingStrategyFactory")
public class PricingStrategyFactory {

    private static final DateTimeFormatter SHOW_TIME_FORMAT = DateTimeFormatter.ofPattern("hh:mm a");
    private static final int PEAK_HOUR_START = 17; // 5 PM

    private final Map<PricingTier, PricingStrategy> strategies = new EnumMap<>(PricingTier.class);

    public PricingStrategyFactory(BasePricingStrategy base, SurgePricingStrategy surge) {
        strategies.put(PricingTier.STANDARD, base);
        strategies.put(PricingTier.PEAK, surge);
    }

    public PricingStrategy resolve(Show show) {
        return strategies.get(classify(show));
    }

    public PricingStrategy forTier(PricingTier tier) {
        return strategies.get(tier);
    }

    /** Public so {@code PricingStrategyTest} can exercise the classification rule directly. */
    public static PricingTier classify(Show show) {
        if (show == null || show.getShowTime() == null) return PricingTier.STANDARD;
        try {
            LocalTime time = LocalTime.parse(show.getShowTime().trim().toUpperCase(), SHOW_TIME_FORMAT);
            return time.getHour() >= PEAK_HOUR_START ? PricingTier.PEAK : PricingTier.STANDARD;
        } catch (DateTimeParseException e) {
            return PricingTier.STANDARD;
        }
    }
}
