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
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }) || null;
}

async function loadUI() {
  const { blockedDomains = [] } = await chrome.storage.sync.get('blockedDomains');
  const tab = await getCurrentTab();
  const currentHost = tab ? await getHostname(tab.url) : null;

  // Update current site status
  const domainEl = document.getElementById('current-domain');
  const statusEl = document.getElementById('current-status');
  const statusTextEl = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-site-btn');
  const toggleText = document.getElementById('toggle-text');

  if (currentHost) {
    if (domainEl) domainEl.textContent = currentHost;
    const matchingDomain = getMatchingProtectedDomain(currentHost, blockedDomains);
    const isEnabled = Boolean(matchingDomain);

    if (isEnabled) {
      statusEl.className = 'status enabled';
      statusTextEl.innerHTML = '✅ Protection is <strong>ACTIVE</strong> on this site';
      toggleText.textContent = 'Disable on this site';
      toggleBtn.classList.add('danger');
    } else {
      statusEl.className = 'status disabled';
      statusTextEl.innerHTML = 'Protection is <strong>DISABLED</strong> on this site';
      toggleText.textContent = 'Enable on this site';
      toggleBtn.classList.remove('danger');
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
    await chrome.storage.sync.set({ blockedDomains: [...blockedDomains, currentHost] });
  }

  loadUI();

  // Auto-reload tab so content script can pick up the change
  setTimeout(() => {
    chrome.tabs.reload(tab.id);
  }, 300);
});

document.getElementById('reload-btn').addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (tab) chrome.tabs.reload(tab.id);
});

// Load everything when popup opens
document.addEventListener('DOMContentLoaded', loadUI);