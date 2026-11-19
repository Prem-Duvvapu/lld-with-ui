package com.lld.learning.examples.sequence;

public final class SequenceDemo {
    public static void main(String[] args) {
        InteractionTrace trace = new InteractionTrace();
        ParcelFees fees = new ParcelFees();
        ReceiptWriter receipts = new ReceiptWriter();
        QuoteDesk desk = new QuoteDesk(fees, receipts, trace);
        QuoteClient client = new QuoteClient(desk, trace);

        for (int grams : new int[]{1000, 0, 1001, 2001, 2000}) {
            trace.clear();
            QuoteDesk.Result result = client.request(grams);
            System.out.println("Request: " + grams + " g");
            for (InteractionTrace.Message message : trace.messages()) {
                System.out.println(message.line());
            }
            System.out.println("Result: accepted=" + result.accepted()
                    + ", feeCents=" + result.quote().feeCents()
                    + ", receipt=" + result.receipt()
                    + ", rejection=" + result.quote().rejection());
        }
    }
}
