// popup.js
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getHostname(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    // Remove www. prefix for cleaner matching
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

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

async function loadUI() {
  const { blockedDomains = [], blockPopups = true, blockRedirects = true } = await chrome.storage.sync.get(['blockedDomains', 'blockPopups', 'blockRedirects']);
  const tab = await getCurrentTab();
  const currentHost = tab ? await getHostname(tab.url) : null;

  // Set options checkboxes
  const popupsCheck = document.getElementById('opt-block-popups');
  const redirectsCheck = document.getElementById('opt-block-redirects');
  if (popupsCheck) popupsCheck.checked = blockPopups;
  if (redirectsCheck) redirectsCheck.checked = blockRedirects;

  // Update current site status
  const domainEl = document.getElementById('current-domain');
  const statusEl = document.getElementById('current-status');
  const statusTextEl = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-site-btn');
  const toggleText = document.getElementById('toggle-text');
  const tldCheckbox = document.getElementById('tld-checkbox-container');

  if (currentHost) {
    if (domainEl) domainEl.textContent = currentHost;
    const matchingDomain = getMatchingProtectedDomain(currentHost, blockedDomains);
    const isEnabled = Boolean(matchingDomain);

    if (isEnabled) {
      statusEl.className = 'status enabled';
      statusTextEl.innerHTML = '✅ Protection is <strong>ACTIVE</strong> on this site';
      toggleText.textContent = 'Disable on this site';
      toggleBtn.classList.add('danger');
      if (tldCheckbox) tldCheckbox.style.display = 'none';
    } else {
      statusEl.className = 'status disabled';
      statusTextEl.innerHTML = 'Protection is <strong>DISABLED</strong> on this site';
      toggleText.textContent = 'Enable on this site';
      toggleBtn.classList.remove('danger');
      if (tldCheckbox) tldCheckbox.style.display = 'flex';
    }
  } else {
    if (domainEl) domainEl.textContent = '(no active tab)';
    statusTextEl.textContent = 'Open a website to manage protection';
    toggleBtn.style.display = 'none';
  }

  // Render protected sites list
  const listEl = document.getElementById('site-list');
  listEl.innerHTML = '';

  if (blockedDomains.length === 0) {
    listEl.innerHTML = `<div class="empty">No websites added yet.<br><small>Click "Enable on this site" to protect it</small></div>`;
    return;
  }

  blockedDomains.forEach(domain => {
    const div = document.createElement('div');
    div.className = 'site-item';
    div.innerHTML = `
      <span>${domain}</span>
      <button class="remove-btn" data-domain="${domain}">Remove</button>
    `;
    listEl.appendChild(div);
  });

  // Remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const domainToRemove = btn.dataset.domain;
      const { blockedDomains = [] } = await chrome.storage.sync.get('blockedDomains');
      const updated = blockedDomains.filter(d => d !== domainToRemove);
      await chrome.storage.sync.set({ blockedDomains: updated });
      loadUI(); // refresh UI
    });
  });
}

function getBaseDomainWithWildcard(hostname) {
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const secondToLast = parts[parts.length - 2];
    if (['co', 'com', 'org', 'net', 'edu', 'gov', 'ac'].includes(secondToLast)) {
      const base = parts.slice(0, -2).join('.');
      return base + '.*';
    }
  }
  const base = parts.slice(0, -1).join('.');
  return base + '.*';
}

// Toggle current site
document.getElementById('toggle-site-btn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (!tab || !tab.url) return;

  const currentHost = await getHostname(tab.url);
  if (!currentHost) return;

  const { blockedDomains = [] } = await chrome.storage.sync.get('blockedDomains');
  const matchingDomain = getMatchingProtectedDomain(currentHost, blockedDomains);

  if (matchingDomain) {
    // Disable on this site
    const updated = blockedDomains.filter(d => d !== matchingDomain);
    await chrome.storage.sync.set({ blockedDomains: updated });
  } else {
    // Enable on this site
    const applyAllTldsEl = document.getElementById('all-tlds-checkbox');
    const applyAllTlds = applyAllTldsEl ? applyAllTldsEl.checked : false;
    const domainToAdd = applyAllTlds ? getBaseDomainWithWildcard(currentHost) : currentHost;
    
    // Only add if not already in the list
    if (!blockedDomains.includes(domainToAdd)) {
      await chrome.storage.sync.set({ blockedDomains: [...blockedDomains, domainToAdd] });
    }
  }

  loadUI();

  // Auto-reload tab so content script can pick up the change
  setTimeout(() => {
    chrome.tabs.reload(tab.id);
  }, 300);
});

// Option listeners
const optBlockPopups = document.getElementById('opt-block-popups');
if (optBlockPopups) {
  optBlockPopups.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ blockPopups: e.target.checked });
  });
}

const optBlockRedirects = document.getElementById('opt-block-redirects');
if (optBlockRedirects) {
  optBlockRedirects.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ blockRedirects: e.target.checked });
  });
}

document.getElementById('reload-btn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (tab) chrome.tabs.reload(tab.id);
});

// Load everything when popup opens
document.addEventListener('DOMContentLoaded', loadUI);