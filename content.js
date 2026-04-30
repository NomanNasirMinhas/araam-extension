// content.js – now whitelist-only
(async () => {
  const { blockedDomains = [], blockPopups = true, blockRedirects = true } = await chrome.storage.sync.get(['blockedDomains', 'blockPopups', 'blockRedirects']);

  const getMatchingProtectedDomain = (hostname, domains) => {
    if (!hostname || !Array.isArray(domains)) return null;
    return domains.find((domain) => {
      if (!domain) return false;
      if (domain.endsWith('.*')) {
        const prefix = domain.slice(0, -2);
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|\\.)${escapedPrefix}\\.`);
        return regex.test(hostname);
      }
      return hostname === domain || hostname.endsWith(`.${domain}`);
    }) || null;
  };
  
  // Get current hostname (without www.)
  let currentHost = null;
  try {
    currentHost = location.hostname.replace(/^www\./, '');
  } catch (e) {}

  // Only activate on whitelisted sites
  const matchingDomain = getMatchingProtectedDomain(currentHost, blockedDomains);
  if (!currentHost || !matchingDomain) {
    console.log('%c[Ad Hijack Blocker] Skipped – this site is not in your protected list', 'color: #666');
    return;
  }

  console.log('%c[Ad Hijack Blocker] ✅ Activated on whitelisted site:', currentHost, 'color: #1a73e8; font-weight: bold');

  // === THE SAME POWERFUL BLOCKER CODE AS BEFORE ===
  const blockerCode = `
    (function() {
      'use strict';
      const BLOCK_POPUPS = ${blockPopups};
      const BLOCK_REDIRECTS = ${blockRedirects};

      console.log('%c[Ad Hijack Blocker] Fully armed on this site', 'color: #1a73e8; font-weight: bold');

      if (BLOCK_POPUPS) {
        // 1. BLOCK window.open completely
        const originalOpen = window.open;
        window.open = function() {
          console.log('%c[Ad Blocker] Blocked window.open', 'color: #d93025');
          return null;
        };
        Object.defineProperty(window, 'open', { configurable: false, writable: false, value: window.open });
      }

      // 2. BLOCK cross-origin redirects
      const shouldBlockRedirect = (url) => {
        if (!BLOCK_REDIRECTS) return false;
        if (!url) return false;
        try {
          const target = new URL(url, location.href);
          if (target.origin !== location.origin) {
            console.log('%c[Ad Blocker] Blocked cross-origin redirect to:', target.href, 'color: #d93025');
            return true;
          }
        } catch (e) {}
        return false;
      };

      if (BLOCK_REDIRECTS) {
        const locationHandler = {
          get(target, prop) {
            const val = target[prop];
            if (typeof val === 'function') {
              return function(...args) {
                if (prop === 'assign' || prop === 'replace') {
                  if (shouldBlockRedirect(args[0])) return undefined;
                }
                return val.apply(target, args);
              };
            }
            return val;
          },
          set(target, prop, value) {
            if (prop === 'href') {
              if (shouldBlockRedirect(value)) return true;
            }
            target[prop] = value;
            return true;
          }
        };

        const locationProxy = new Proxy(window.location, locationHandler);
        Object.defineProperty(window, 'location', { value: locationProxy, writable: false, configurable: false });
        Object.defineProperty(document, 'location', { value: locationProxy, writable: false, configurable: false });
      }

      // 3. Force all links to open in same tab
      function forceSameTabLinks() {
        if (BLOCK_POPUPS) {
          document.querySelectorAll('a[target="_blank"], a[onclick*="window.open"], a[onclick*="open("]').forEach(link => {
            if (link.target === '_blank') link.target = '_self';
            const onclick = link.getAttribute('onclick');
            if (onclick && (onclick.includes('window.open') || onclick.includes('open('))) {
              link.setAttribute('onclick', onclick.replace(/window\\.open|open\\(/g, 'console.log("blocked")'));
            }
          });
        }
      }

      // 4. MutationObserver for dynamic content + remove meta refresh
      const observer = new MutationObserver(() => {
        forceSameTabLinks();
        if (BLOCK_REDIRECTS) {
          document.querySelectorAll('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]').forEach(m => m.remove());
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      forceSameTabLinks();

      console.log('%c[Ad Hijack Blocker] Ready – no more ad tabs or sneaky redirects!', 'color: #1a73e8');
    })();
  `;

  const script = document.createElement('script');
  script.textContent = blockerCode;
  (document.head || document.documentElement).prepend(script);
  script.remove();
})();