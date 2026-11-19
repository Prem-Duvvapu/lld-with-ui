package com.lld.learning.examples.activity;

/** Raw input: validation belongs to the workflow, so invalid requests can be modeled. */
public record BookingRequest(String roomId, int attendees) { }
