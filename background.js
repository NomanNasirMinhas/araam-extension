// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Start completely disabled (empty whitelist)
  chrome.storage.sync.set({ blockedDomains: [] });
});

function isProtectedDomain(hostname, blockedDomains) {
  if (!hostname || !Array.isArray(blockedDomains)) return false;
  return blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

// Use async so we can "await" the opener tab's details
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log("New tab object:", tab);

  let openerDomain = "Unknown (No opener or user-initiated)";

  // If the new tab has an opener, fetch the opener tab's details
  if (tab.openerTabId !== undefined) {
    try {
      const openerTab = await chrome.tabs.get(tab.openerTabId);
      const openerUrl = openerTab.url || openerTab.pendingUrl;

      if (openerUrl) {
        // Extract just the domain (hostname) from the full URL
        openerDomain = new URL(openerUrl).hostname.replace(/^www\./, '');
      }
    } catch (error) {
      console.log(
        "Could not fetch opener tab details. It may have closed quickly.",
        error,
      );
    }
  }

  let { blockedDomains = [] } = await chrome.storage.sync.get("blockedDomains");

  // Log the domain where the new tab came from
  console.log(
    `%c👉 New tab triggered from domain: ${openerDomain}`,
    "color: #0078D7; font-weight: bold;",
  );

  // Your original blocking logic
  if (isProtectedDomain(openerDomain, blockedDomains)) {
    if (!(tab.height === 0 && tab.width === 0) && !tab.pendingUrl) {
      console.log(
        `%c[Ad Hijack Blocker] Closing suspicious new tab opened by script. Origin: ${openerDomain}`,
        "color: #d93025",
      );
      chrome.tabs.remove(tab.id);
    }
  }
});
