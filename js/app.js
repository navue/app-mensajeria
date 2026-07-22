/* ---------------- VARIABLES GLOBALES ---------------- */

let editProfilePhotoBase64 = null;
let currentChatUser = null;
let unsubscribeMessages = null;
let lastNotificationMessageId = null;

/* ---------------- INICIALIZACION ---------------- */

window.onload = async () => {
  await initFirebase();
  const user = getCurrentUser();
  user ? showChat() : showLogin();
  initEvents();
};

/* ---------------- EVENTOS ---------------- */

function initEvents() {
  const input = document.getElementById("registerPhoto");
  const sendBtn = document.getElementById("sendBtn");
  const registerPhotoLabel = document.getElementById("registerPhotoLabel");
  const editPhotoPreview = document.getElementById("editPhotoPreview");
  const editPhotoInput = document.getElementById("editPhoto");
  const editInput = document.getElementById("editPhoto");
  const profileStatus = document.getElementById("profileStatus");
  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const blockUserBtn = document.getElementById("blockUserBtn");

  input?.addEventListener("change", handlePhotoChange);
  sendBtn?.addEventListener("pointerdown", sendMessage);
  registerPhotoLabel?.addEventListener("click", () => {
    document.getElementById("registerPhoto").click();
  });
  editPhotoPreview?.addEventListener("click", () => {
    editPhotoInput.value = "";
    editPhotoInput.click();
  });
  if (editInput) {
    editInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      readFileAsBase64(file, (base64) => {
        editProfilePhotoBase64 = base64;
        document.getElementById("editPhotoPreview").src = base64;
      });
    });
  }
  profileStatus?.addEventListener("change", updateStatus);
  profilePhoto?.addEventListener("click", () => {
    profilePhotoInput.value = "";
    profilePhotoInput.click();
  });
  profilePhotoInput?.addEventListener("change", updateProfilePhoto);
  blockUserBtn?.addEventListener("pointerdown", toggleBlockUser);
}

/* ---------------- NAVEGACION ---------------- */

function showView(viewId) {
  ["loginView", "registerView", "editProfileView", "chatView"].forEach((id) => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById(viewId).style.display = "block";
}

function showLogin() {
  clearLoginForm();
  showView("loginView");
  document.querySelector(".app-container").classList.remove("chat-mode");
}

function showRegister() {
  clearRegisterForm();
  showView("registerView");
}

function backToLogin() {
  clearRegisterForm();
  showLogin();
}

async function showEditProfile() {
  showView("editProfileView");
  await loadEditProfile();
}

async function showChat() {
  document.getElementById("chatBox").style.display = "none";
  document.getElementById("noChatSelected").style.display = "flex";
  showLoading();
  try {
    showView("chatView");
    document.querySelector(".app-container").classList.add("chat-mode");
    const chatBox = document.getElementById("chatBox");
    const noChatSelected = document.getElementById("noChatSelected");
    if (chatBox) chatBox.style.display = "none";
    if (noChatSelected) noChatSelected.style.display = "flex";
    currentChatUser = null;
    await loadProfile();
    await loadUsers();
  } finally {
    hideLoading();
  }
}

/* ---------------- AUTENTICACION ---------------- */

async function login() {
  const email = document
    .getElementById("loginEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    return showMessage("Por favor completá email y contraseña", "error");
  }

  const result = await loginUser(email, password);

  if (result.error) {
    if (result.error === "La cuenta fue eliminada") {
      clearLoginForm();
    }
    showMessage(result.error, "error");
    return;
  }
  await showChat();
}

async function register() {
  const email = document
    .getElementById("registerEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const name = document.getElementById("registerName").value;
  const lastName = document.getElementById("registerLastName").value;
  const nickname = document.getElementById("registerNickname").value.trim();
  const file = document.getElementById("registerPhoto").files[0];

  if (!email) return showMessage("El email es obligatorio", "error");
  if (!validateEmail(email)) return showMessage("Email inválido", "error");
  if (!password) {
    return showMessage("La contraseña es obligatoria", "error");
  }
  if (!validatePassword(password)) {
    return showMessage(
      "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
      "error",
    );
  }
  if (!name) return showMessage("El nombre es obligatorio", "error");
  if (!lastName) return showMessage("El apellido es obligatorio", "error");
  if (!nickname) return showMessage("El apodo es obligatorio", "error");
  if (file) {
    readFileAsBase64(file, async (photoBase64) => {
      const result = await registerUser(
        email,
        password,
        name,
        lastName,
        nickname,
        photoBase64,
      );
      handleRegisterResult(result);
    });
    return;
  }
  const result = await registerUser(
    email,
    password,
    name,
    lastName,
    nickname,
    null,
  );
  handleRegisterResult(result);
}

function handleRegisterResult(result) {
  if (result.error) {
    showMessage(result.error, "error");
  } else {
    clearRegisterForm();
    showMessage("Usuario creado correctamente", "ok");
    showLogin();
  }
}

function logout() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  currentChatUser = null;
  localStorage.removeItem("currentChatUser");
  const chatBox = document.getElementById("chatBox");
  if (chatBox) {
    chatBox.classList.add("hidden");
    chatBox.style.display = "none";
  }
  const messagesContainer = document.getElementById("messages");
  if (messagesContainer) {
    messagesContainer.innerHTML = "";
  }
  logoutUser();
  clearLoginForm();
  showLogin();
}

/* ---------------- PERFIL ---------------- */

async function loadProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const users = await getUsers();
  const fullUser = users.find((u) => u.id === currentUser.id);
  if (!fullUser) return;
  document.getElementById("profileNickname").textContent =
    fullUser.nickname || "Usuario";
  document.getElementById("profileStatus").value = fullUser.status || "";
  document.getElementById("profilePhoto").src =
    fullUser.photo && fullUser.photo !== "undefined"
      ? fullUser.photo
      : "assets/images/foto.png";
}

async function loadEditProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const users = await getUsers();
  const fullUser = users.find((u) => u.id === currentUser.id);
  if (!fullUser) return;
  document.getElementById("editProfileEmail").value = fullUser.email || "";
  document.getElementById("editProfileName").value = fullUser.name || "";
  document.getElementById("editProfileLastName").value =
    fullUser.lastName || "";
  document.getElementById("editProfileNickname").value =
    fullUser.nickname || "";
  document.getElementById("editPhotoPreview").src =
    fullUser.photo || "assets/images/foto.png";
  editProfilePhotoBase64 = fullUser.photo || null;
}

async function updateStatus() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const status = document.getElementById("profileStatus").value;
  await updateUser(currentUser.id, {
    status,
  });
  const updatedUser = {
    ...currentUser,
    status,
  };
  localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  showMessage("Estado actualizado", "ok");
}

async function updateProfilePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const currentUser = getCurrentUser();
  readFileAsBase64(file, async (base64) => {
    await updateUser(currentUser.id, {
      photo: base64,
    });
    document.getElementById("profilePhoto").src = base64;
    showMessage("Foto actualizada", "ok");
  });
}

async function saveProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const email = document
    .getElementById("editProfileEmail")
    .value.trim()
    .toLowerCase();
  const name = document.getElementById("editProfileName").value.trim();
  const lastName = document.getElementById("editProfileLastName").value.trim();
  const nickname = document.getElementById("editProfileNickname").value.trim();
  const password = document.getElementById("editProfilePassword").value.trim();
  const confirmPassword = document
    .getElementById("editConfirmPassword")
    .value.trim();

  if (password !== confirmPassword) {
    return showMessage("Las contraseñas no coinciden", "error");
  }
  let photo = editProfilePhotoBase64;
  if (!photo) {
    const preview = document.getElementById("editPhotoPreview").src;
    if (preview.includes("assets/images/foto.png")) {
      photo = null;
    }
  }
  if (!email) {
    return showMessage("El email es obligatorio", "error");
  }
  if (!validateEmail(email)) {
    return showMessage("Email inválido", "error");
  }

  const users = await getUsers();
  const emailExists = users.find(
    (u) => u.email.toLowerCase() === email && u.id !== currentUser.id,
  );

  if (emailExists) {
    return showMessage("Email ya registrado", "error");
  }
  if (!name) {
    return showMessage("El nombre es obligatorio", "error");
  }
  if (!lastName) {
    return showMessage("El apellido es obligatorio", "error");
  }
  if (!nickname) {
    return showMessage("El apodo es obligatorio", "error");
  }

  const updatedData = {
    email,
    name,
    lastName,
    nickname,
    photo,
  };

  if (password) {
    if (!validatePassword(password)) {
      return showMessage(
        "La contraseña debe tener al menos 6 caracteres y números",
        "error",
      );
    }
    updatedData.password = password;
  }
  await updateUser(currentUser.id, updatedData);
  const updatedUser = {
    ...currentUser,
    ...updatedData,
  };
  localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  showMessage("Perfil actualizado", "ok");
  document.getElementById("editProfilePassword").value = "";
  document.getElementById("editConfirmPassword").value = "";
  await loadProfile();
  await loadUsers();
  showChat();
}

/* ---------------- CONTACTOS / CHAT ---------------- */

async function loadUsers() {
  const users = await getUsers();
  const messages = await getMessages();
  const currentUser = getCurrentUser();
  const container = document.getElementById("usersList");
  container.innerHTML = "";
  const sortedUsers = users
    .filter((user) => user.id !== currentUser.id && user.active !== false)
    .map((user) => {
      const conversationMessages = messages.filter(
        (m) =>
          (m.from === currentUser.id && m.to === user.id) ||
          (m.from === user.id && m.to === currentUser.id),
      );
      const lastActivity =
        conversationMessages.length > 0
          ? Math.max(...conversationMessages.map((m) => m.createdAt || 0))
          : 0;
      return {
        ...user,
        lastActivity,
      };
    })
    .sort((a, b) => b.lastActivity - a.lastActivity);
  sortedUsers.forEach((user) => {
    container.appendChild(createUserElement(user));
  });
}

function createUserElement(user) {
  const div = document.createElement("div");
  div.classList.add("user-item");

  const currentUser = getCurrentUser();
  const blockedMe = (user.blockedUsers || []).includes(currentUser.id);
  const photo = blockedMe
    ? "assets/images/foto.png"
    : user.photo && user.photo !== "undefined"
      ? user.photo
      : "assets/images/foto.png";

  const nickname = blockedMe ? "Usuario" : user.nickname;
  div.innerHTML = `
    <div class="user-info">
      <img src="${photo}">
      <div class="user-text">
        <p><b>${nickname}</b></p>
      </div>
    </div>
  `;

  div.addEventListener("pointerdown", () => {
    startChat(user.id);
  });

  return div;
}

async function startChat(userId) {
  document.getElementById("noChatSelected").style.display = "none";
  document.getElementById("chatBox").classList.remove("hidden");
  document.getElementById("chatBox").style.display = "flex";
  const users = await getUsers();
  const currentUser = users.find((u) => u.id === getCurrentUser().id);
  if (currentUser.blockedUsers?.includes(userId)) return;
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  currentChatUser = userId;
  const container = document.getElementById("messages");
  if (container) container.innerHTML = "";
  await markMessagesAsRead(userId);
  const chatBox = document.getElementById("chatBox");
  const noChatSelected = document.getElementById("noChatSelected");
  if (noChatSelected) noChatSelected.style.display = "none";
  if (chatBox) {
    chatBox.classList.remove("hidden");
    chatBox.style.display = "flex";
  }
  await updateChatHeader(userId);
  loadMessages();
}

async function updateChatHeader(userId) {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  const currentUser = users.find((u) => u.id === getCurrentUser().id);
  const chatUserInfo = document.getElementById("chatUserInfo");
  const blockBtn = document.getElementById("blockUserBtn");
  if (!user) {
    chatUserInfo.textContent = "Seleccioná un contacto";
    blockBtn.style.display = "none";
    return;
  }
  const blockedMe = (user.blockedUsers || []).includes(currentUser.id);
  const iBlocked = (currentUser.blockedUsers || []).includes(userId);
  chatUserInfo.textContent = blockedMe
    ? "Usuario"
    : `${user.nickname}`;
  blockBtn.style.display = "block";
  blockBtn.textContent = iBlocked ? "Desbloquear" : "Bloquear";
}

/* ---------------- MENSAJES ---------------- */

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text) {
    return showMessage("Escribí un mensaje", "error");
  }
  if (!currentChatUser) {
    return showMessage("Seleccioná un contacto", "error");
  }
  await addMessage(currentChatUser, text);
  input.value = "";
  await loadMessages();
  const container = document.getElementById("messages");
  container.scrollTop = container.scrollHeight;
  showMessage("Mensaje enviado", "ok");
}

function loadMessages() {
  const container = document.getElementById("messages");

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  unsubscribeMessages = subscribeToMessages((messages) => {
    const currentUser = getCurrentUser();
    container.innerHTML = "";
    const filteredMessages = messages.filter((m) => {
      if (m.blocked && m.to === currentUser.id) {
        return false;
      }

      return (
        (m.from === currentUser.id && m.to === currentChatUser) ||
        (m.from === currentChatUser && m.to === currentUser.id)
      );
    });
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage &&
      latestMessage.id !== lastNotificationMessageId &&
      latestMessage.from !== currentUser.id &&
      latestMessage.to === currentUser.id
    ) {
      lastNotificationMessageId = latestMessage.id;
      if (latestMessage.from !== currentChatUser) {
        getUsers().then((users) => {
          const sender = users.find((u) => u.id === latestMessage.from);
          if (sender) {
            showMessage(`Nuevo mensaje de ${sender.nickname}`, "ok");
          }
        });
      }
    }
    filteredMessages.forEach((m) => {
      container.appendChild(createMessageElement(m, currentUser));
    });
    const unreadMessages = filteredMessages.filter(
      (m) => m.from === currentChatUser && m.to === currentUser.id && !m.read,
    );
    if (unreadMessages.length > 0) {
      markMessagesAsRead(currentChatUser);
    }
    hideLoading();
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 0);
    loadUsers();
  });
}

function createMessageElement(message, currentUser) {
  const div = document.createElement("div");
  div.classList.add(
    "message",
    message.from === currentUser.id ? "me" : "other",
  );
  const isDeleted = !message.text || message.text.trim() === "";
  const messageContent = isDeleted
    ? `<span class="deleted-text-style">Mensaje eliminado</span>`
    : message.text;

  div.innerHTML = `
    <div class="message-text" id="text-${message.id}">
      ${messageContent}
    </div>

    <div class="message-date">
      ${formatMessageDate(message.createdAt)}
    </div>

    ${
      message.from === currentUser.id
        ? `
          <div class="message-footer" id="footer-${message.id}">

            <div class="message-status">
              ${message.edited && !isDeleted ? "editado" : ""}
              ${message.read ? " ✓✓" : " ✓"}
            </div>

            ${
              !isDeleted
                ? `
              <div class="message-actions">
                <img
                  class="edit-icon"
                  src="assets/icons/editar.png"
                  alt="Editar"
                  title="Editar mensaje"
                  onclick="editMessage('${message.id}')">

                <img
                  class="delete-icon"
                  src="assets/icons/eliminar.png"
                  alt="Eliminar"
                  title="Eliminar mensaje"
                  onclick="removeMessage('${message.id}')">
              </div>
            `
                : ""
            }

          </div>
        `
        : `
          <div class="message-status">
            ${message.edited && !isDeleted ? "editado" : ""}
          </div>
        `
    }
  `;

  return div;
}

async function editMessage(messageId) {
  const textContainer = document.getElementById(`text-${messageId}`);
  const footerContainer = document.getElementById(`footer-${messageId}`);
  if (footerContainer) footerContainer.style.display = "none";
  const currentText = textContainer.textContent.trim();
  textContainer.innerHTML = `
  <input
    id="edit-input-${messageId}"
    value="${currentText}"
    class="edit-message-input">

  <div class="edit-buttons">

    <button
      class="edit-save-btn"
      onclick="saveEditedMessage('${messageId}')">
      Guardar
    </button>

    <button
      class="edit-cancel-btn"
      onclick="loadMessages()">
      Cancelar
    </button>

  </div>
`;

  const messageElement = textContainer.closest(".message");
  setTimeout(() => {
    messageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 50);
}

async function saveEditedMessage(messageId) {
  const input = document.getElementById(`edit-input-${messageId}`);
  const newText = input.value.trim();
  if (!newText) return;
  await updateMessage(messageId, newText);
  showMessage("Mensaje actualizado", "ok");
}

async function removeMessage(messageId) {
  const messages = await getMessages();
  const message = messages.find((m) => m.id === messageId);
  if (!message) return;
  const currentUser = getCurrentUser();
  if (message.from !== currentUser.id) {
    return showMessage("No podés eliminar este mensaje", "error");
  }
  const textContainer = document.getElementById(`text-${messageId}`);
  const footerContainer = document.getElementById(`footer-${messageId}`);
  if (footerContainer) footerContainer.style.display = "none";

  textContainer.innerHTML = `
    <div class="delete-confirmation-text">¿Eliminar este mensaje?</div>
    <div class="edit-buttons">
      <button
        class="delete-confirm-btn"
        onclick="confirmDeleteMessage('${messageId}')">
        Eliminar
      </button>
      <button
        class="edit-cancel-btn"
        onclick="loadMessages()">
        Cancelar
      </button>
    </div>
  `;

  const messageElement = textContainer.closest(".message");
  setTimeout(() => {
    messageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 50);
}

async function confirmDeleteMessage(messageId) {
  await updateMessage(messageId, "");
  showMessage("Mensaje eliminado", "ok");
}

function formatMessageDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- FOTOS ---------------- */

function handlePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  readFileAsBase64(file, (base64) => {
    document.getElementById("photoPreview").src = base64;
  });
}

function handleProfilePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  readFileAsBase64(file, (base64) => {
    document.getElementById("profilePhoto").src = base64;
  });
}

function removePhoto() {
  document.getElementById("photoPreview").src = "assets/images/foto.png";
  document.getElementById("registerPhoto").value = "";
}

/* ---------------- VALIDACIONES Y UTILIDADES ---------------- */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);
}

function clearRegisterForm() {
  document.getElementById("registerEmail").value = "";
  document.getElementById("registerPassword").value = "";
  document.getElementById("registerName").value = "";
  document.getElementById("registerLastName").value = "";
  document.getElementById("registerNickname").value = "";
  document.getElementById("registerPhoto").value = "";
  document.getElementById("photoPreview").src = "assets/images/foto.png";
}

function clearLoginForm() {
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
}

function readFileAsBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const maxWidth = 300;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
      callback(compressedBase64);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function showMessage(text, type = "ok") {
  const msg = document.getElementById("globalMessage");
  msg.textContent = text;
  msg.className = `show ${type}`;
  clearTimeout(msg._timeout);
  msg._timeout = setTimeout(() => {
    msg.className = "";
  }, 2500);
}

/* ---------------- MODAL ELIMINAR PERFIL ---------------- */

function showDeleteProfileModal() {
  document.getElementById("deleteProfileModal").classList.remove("hidden");

  document.getElementById("deleteProfilePassword").value = "";
}

function closeDeleteProfileModal() {
  document.getElementById("deleteProfileModal").classList.add("hidden");
}

async function confirmDeleteProfile() {
  const password = document
    .getElementById("deleteProfilePassword")
    .value.trim();

  if (!password) {
    return showMessage("Ingresá tu contraseña", "error");
  }

  const currentUser = getCurrentUser();

  const users = await getUsersWithPassword();

  const user = users.find(
    (u) => u.id === currentUser.id && u.password === password,
  );

  if (!user) {
    return showMessage("Contraseña incorrecta", "error");
  }

  await deleteUser(currentUser.id);

  logout();

  closeDeleteProfileModal();

  showMessage("Perfil eliminado correctamente", "ok");
}

/* ---------------- BLOQUEAR USUARIO ---------------- */

async function toggleBlockUser() {
  if (!currentChatUser) return;
  const users = await getUsers();
  const currentUser = users.find((u) => u.id === getCurrentUser().id);
  const isBlocked = currentUser.blockedUsers?.includes(currentChatUser);
  if (isBlocked) {
    await unblockUser(currentChatUser);
    showMessage("Usuario desbloqueado", "ok");
  } else {
    await blockUser(currentChatUser);
    showMessage("Usuario bloqueado", "ok");
  }
  await loadUsers();
  await updateChatHeader(currentChatUser);
}

/* ---------------- LOADING SPINNER ---------------- */

function showLoading() {
  document.getElementById("loadingOverlay")?.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay")?.classList.add("hidden");
}
