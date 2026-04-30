// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedDomains', 'blockPopups', 'blockRedirects'], (res) => {
    const updates = {};
    if (res.blockedDomains === undefined) updates.blockedDomains = [];
    if (res.blockPopups === undefined) updates.blockPopups = true;
    if (res.blockRedirects === undefined) updates.blockRedirects = true;
    if (Object.keys(updates).length > 0) chrome.storage.sync.set(updates);
  });
});

function getMatchingProtectedDomain(hostname, blockedDomains) {
  if (!hostname || !Array.isArray(blockedDomains)) return null;
  return blockedDomains.find((domain) => {
    if (!domain) return false;
    if (domain.endsWith('.*')) {
      const prefix = domain.slice(0, -2);
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\.)${escapedPrefix}\\.`);
      return regex.test(hostname);
    }
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }) || null;
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

  let { blockedDomains = [], blockPopups = true } = await chrome.storage.sync.get(["blockedDomains", "blockPopups"]);

  // Log the domain where the new tab came from
  console.log(
    `%c👉 New tab triggered from domain: ${openerDomain}`,
    "color: #0078D7; font-weight: bold;",
  );

  // Your original blocking logic
  if (blockPopups && getMatchingProtectedDomain(openerDomain, blockedDomains)) {
    if (!tab.pendingUrl) {
      console.log(
        `%c[Ad Hijack Blocker] Closing suspicious new tab opened by script. Origin: ${openerDomain}`,
        "color: #d93025",
      );
      chrome.tabs.remove(tab.id);
    }
  }
});
