package com.lld.webcrawler.util;

import com.lld.webcrawler.exception.InvalidSeedUrlException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class UrlUtilsTest {

    @Test
    void extractDomainStripsSchemeAndPath() {
        assertEquals("a.com", UrlUtils.extractDomain("http://a.com/path/to/page"));
        assertEquals("a.com", UrlUtils.extractDomain("https://a.com"));
        assertEquals("a.com", UrlUtils.extractDomain("a.com/no-scheme"));
    }

    @Test
    void extractDomainThrowsOnBlankOrHostlessUrl() {
        assertThrows(InvalidSeedUrlException.class, () -> UrlUtils.extractDomain(""));
        assertThrows(InvalidSeedUrlException.class, () -> UrlUtils.extractDomain("http://"));
    }

    @Test
    void isWellFormedNeverThrows() {
        assertTrue(UrlUtils.isWellFormed("http://a.com"));
        assertFalse(UrlUtils.isWellFormed(""));
        assertFalse(UrlUtils.isWellFormed("http://"));
        assertFalse(UrlUtils.isWellFormed(null));
    }
}
