let editProfilePhotoBase64 = null;

window.onload = async () => {
  await initFirebase();

  const user = getCurrentUser();

  user ? showChat() : showLogin();

  initEvents();
};

let currentChatUser = null;
let unsubscribeMessages = null;
let lastNotificationMessageId = null;

function initEvents() {
  const input = document.getElementById("registerPhoto");
  const sendBtn = document.getElementById("sendBtn");
  const photo = document.getElementById("photoPreview");

  input?.addEventListener("change", handlePhotoChange);
  sendBtn?.addEventListener("pointerdown", sendMessage);

  photo?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handlePhotoClick();
  });

  const profilePhoto = document.getElementById("profilePhoto");

  const editPhotoPreview = document.getElementById("editPhotoPreview");

  const editPhotoInput = document.getElementById("editPhoto");

  editPhotoPreview?.addEventListener("pointerdown", () => {
    editPhotoInput.click();
  });

  const editInput = document.getElementById("editPhoto");

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

  const profileStatus = document.getElementById("profileStatus");

  profileStatus?.addEventListener("change", updateStatus);
}

const profilePhoto = document.getElementById("profilePhoto");

const profilePhotoInput = document.getElementById("profilePhotoInput");

profilePhoto?.addEventListener("pointerdown", () => {
  profilePhotoInput.click();
});

profilePhotoInput?.addEventListener("change", updateProfilePhoto);

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

function showView(viewId) {
  ["loginView", "registerView", "editProfileView", "chatView"].forEach((id) => {
    document.getElementById(id).style.display = "none";
  });

  document.getElementById(viewId).style.display = "block";
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
  showView("chatView");

  document.querySelector(".app-container").classList.add("chat-mode");

  await loadProfile();

  await loadUsers();

  const currentUser = getCurrentUser();

  const messages = await getMessages();

  const userMessages = messages.filter(
    (m) => m.from === currentUser.id || m.to === currentUser.id,
  );

  if (userMessages.length > 0) {
    const lastMessage = userMessages[userMessages.length - 1];

    currentChatUser =
      lastMessage.from === currentUser.id ? lastMessage.to : lastMessage.from;

    localStorage.setItem("currentChatUser", currentChatUser);

    document.getElementById("chatBox").style.display = "block";

    await updateChatHeader(currentChatUser);

    loadMessages();

    return;
  }

  const savedChatUser = localStorage.getItem("currentChatUser");

  if (savedChatUser) {
    currentChatUser = savedChatUser;

    document.getElementById("chatBox").style.display = "block";

    await updateChatHeader(currentChatUser);

    loadMessages();
  }
}

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

function showLogin() {
  clearLoginForm();

  showView("loginView");

  document.querySelector(".app-container").classList.remove("chat-mode");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password);
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
    showMessage(result.error, "error");
  } else {
    await showChat();
  }
}

function logout() {
  logoutUser();

  localStorage.removeItem("currentChatUser");

  clearLoginForm();
  showLogin();
}

async function loadUsers() {
  const users = await getUsers();
  const messages = await getMessages();
  const currentUser = getCurrentUser();

  const container = document.getElementById("usersList");

  container.innerHTML = "";

  const sortedUsers = users
    .filter((u) => u.id !== currentUser.id)
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

async function updateChatHeader(userId) {
  const users = await getUsers();

  const user = users.find((u) => u.id === userId);

  const chatUserInfo = document.getElementById("chatUserInfo");

  if (!user) {
    chatUserInfo.textContent = "Seleccioná un contacto";

    return;
  }

  chatUserInfo.textContent = `Hablando con ${user.nickname}`;
}

function createUserElement(user) {
  const div = document.createElement("div");

  div.classList.add("user-item");

  const photo =
    user.photo && user.photo !== "undefined"
      ? user.photo
      : "assets/images/foto.png";

  div.innerHTML = `
    <div class="user-info">
      <img src="${photo}">
      <div class="user-text">
        <p><b>${user.nickname}</b></p>
      </div>
    </div>
  `;

  div.addEventListener("pointerdown", () => {
    startChat(user.id);
  });

  return div;
}

async function startChat(userId) {
  currentChatUser = userId;

  localStorage.setItem("currentChatUser", userId);

  await markMessagesAsRead(userId);

  document.getElementById("chatBox").style.display = "block";

  await updateChatHeader(userId);

  await loadMessages();
}

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

async function editMessage(messageId) {
  const messages = await getMessages();

  const message = messages.find((m) => m.id === messageId);

  if (!message) return;

  const newText = prompt("Editar mensaje", message.text);

  if (!newText) return;

  await updateMessage(messageId, newText.trim());

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

  const confirmed = confirm("¿Eliminar este mensaje?");

  if (!confirmed) return;

  await deleteMessage(messageId);

  showMessage("Mensaje eliminado", "ok");
}

function loadMessages() {
  const currentUser = getCurrentUser();

  const container = document.getElementById("messages");

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  unsubscribeMessages = subscribeToMessages((messages) => {
    const currentUser = getCurrentUser();

    container.innerHTML = "";

    const filteredMessages = messages.filter(
      (m) =>
        (m.from === currentUser.id && m.to === currentChatUser) ||
        (m.from === currentChatUser && m.to === currentUser.id),
    );

    const latestMessage = messages[messages.length - 1];

    if (
      latestMessage &&
      latestMessage.id !== lastNotificationMessageId &&
      latestMessage.from !== currentUser.id &&
      latestMessage.from !== currentChatUser
    ) {
      lastNotificationMessageId = latestMessage.id;

      getUsers().then((users) => {
        const sender = users.find((u) => u.id === latestMessage.from);

        if (sender) {
          showMessage(`Nuevo mensaje de ${sender.nickname}`, "ok");
        }
      });
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

  div.innerHTML = `
  <div>${message.text}</div>

  ${
    message.from === currentUser.id
      ? `
        <div class="message-actions">

          <div class="message-status">
            ${message.edited ? "editado " : ""}
            ${message.read ? "✓✓" : "✓"}
          </div>

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
`;

  return div;
}

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

function handlePhotoClick() {
  const input = document.getElementById("registerPhoto");

  if (input.files?.length > 0) {
    removePhoto();
  } else {
    input.click();
  }
}

function removePhoto() {
  document.getElementById("photoPreview").src = "assets/images/foto.png";

  document.getElementById("registerPhoto").value = "";
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
