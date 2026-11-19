package com.lld.learning.examples.kiss;

public final class KissDemo {
    public static void main(String[] args) {
        RuleBasedParcelFees rules = new RuleBasedParcelFees();
        ParcelFees direct = new ParcelFees();
        for (int grams : new int[]{1, 1000, 1001, 2000, 0, 2001, 1000}) {
            System.out.println(grams + " g -> rules=" + rulesResult(rules, grams)
                    + "; direct=" + directResult(direct, grams));
        }
    }

    private static String rulesResult(RuleBasedParcelFees fees, int grams) {
        try {
            return fees.feeCents(grams) + " cents";
        } catch (IllegalArgumentException rejection) {
            return rejection.getClass().getSimpleName() + ": " + rejection.getMessage();
        }
    }

    private static String directResult(ParcelFees fees, int grams) {
        try {
            return fees.feeCents(grams) + " cents";
        } catch (IllegalArgumentException rejection) {
            return rejection.getClass().getSimpleName() + ": " + rejection.getMessage();
        }
    }
}
