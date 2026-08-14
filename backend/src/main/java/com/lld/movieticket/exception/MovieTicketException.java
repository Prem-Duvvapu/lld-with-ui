package com.lld.movieticket.exception;

public class MovieTicketException extends RuntimeException {
    private final String errorCode;

    public MovieTicketException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
