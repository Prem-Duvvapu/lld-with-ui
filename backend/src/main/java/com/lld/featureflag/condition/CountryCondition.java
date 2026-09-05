package com.lld.featureflag.condition;

import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.UserContext;

/** Leaf condition: matches when the user's country equals a fixed, case-insensitive code. */
public class CountryCondition implements Condition {

    private final String country;

    public CountryCondition(String country) {
        if (country == null || country.isBlank()) {
            throw new InvalidRuleException("CountryCondition requires a non-blank country code.");
        }
        this.country = country.trim().toUpperCase();
    }

    public String getCountry() {
        return country;
    }

    @Override
    public boolean evaluate(UserContext ctx) {
        return ctx != null && ctx.getCountry() != null && ctx.getCountry().equalsIgnoreCase(country);
    }

    @Override
    public String describe() {
        return "country == " + country;
    }
}
