(function () {
    "use strict";

    const STORAGE_KEY = "apdTrafficSource";

    const SOURCE_LABELS = {
        "hp": "HP",
        "website": "HP",
        "lp": "LP",
        "faxdm": "FAXDM",
        "fax-dm": "FAXDM",
        "youtube": "YouTube",
        "instagram": "Instagram",
        "threads": "Threads",
        "facebook": "Facebook",
        "tiktok": "TikTok",
        "x": "X",
        "twitter": "X"
    };

    const REFERRER_PATTERNS = [
        { pattern: /instagram\.com|l\.instagram\.com/i, label: "Instagram" },
        { pattern: /youtube\.com|youtu\.be/i, label: "YouTube" },
        { pattern: /threads\.(com|net)/i, label: "Threads" },
        { pattern: /facebook\.com|fb\.com|l\.facebook\.com/i, label: "Facebook" },
        { pattern: /tiktok\.com/i, label: "TikTok" },
        { pattern: /twitter\.com|x\.com|t\.co/i, label: "X" }
    ];

    function normalizeSource(value) {
        if (!value) return "";
        const trimmed = String(value).trim();
        if (!trimmed) return "";
        const key = trimmed.toLowerCase();
        return SOURCE_LABELS[key] || trimmed;
    }

    function sourceFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return normalizeSource(
            params.get("utm_source") ||
            params.get("source") ||
            params.get("ref")
        );
    }

    function sourceFromReferrer() {
        if (!document.referrer) return "";

        try {
            const referrerUrl = new URL(document.referrer);
            if (referrerUrl.hostname === window.location.hostname) return "";

            const matched = REFERRER_PATTERNS.find((item) => item.pattern.test(referrerUrl.hostname));
            if (matched) return matched.label;
            return referrerUrl.hostname.replace(/^www\./, "");
        } catch (error) {
            return "";
        }
    }

    function getStoredSource() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) || "";
        } catch (error) {
            return "";
        }
    }

    function storeSource(source) {
        if (!source) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, source);
        } catch (error) {
            // Storage can be disabled in strict browsing modes.
        }
    }

    function getCurrentSource() {
        const detected = sourceFromUrl() || sourceFromReferrer();
        if (detected) {
            storeSource(detected);
            return detected;
        }
        return getStoredSource();
    }

    function decorateContactLinks(source) {
        if (!source) return;

        document.querySelectorAll('a[href^="contact.html"]').forEach((link) => {
            const url = new URL(link.getAttribute("href"), window.location.href);
            if (!url.searchParams.get("source")) {
                url.searchParams.set("source", source);
                link.setAttribute("href", url.pathname.split("/").pop() + url.search + url.hash);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const source = getCurrentSource();
        decorateContactLinks(source);
    });

    window.ApdTrafficSource = {
        get: getCurrentSource,
        normalize: normalizeSource
    };
})();
