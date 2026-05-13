window.onload = () => {
  const user = getCurrentUser();
  user ? showChat() : showLogin();

  initEvents();
};

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
}

function showView(viewId) {
  ["loginView", "registerView", "chatView"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });

  document.getElementById(viewId).style.display = "block";
}

function showRegister() {
  showView("registerView");
}

function showChat() {
  showView("chatView");

  document.querySelector(".app-container").classList.add("chat-mode");
  loadUsers();
}

function showLogin() {
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
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const name = document.getElementById("registerName").value;
  const lastName = document.getElementById("registerLastName").value;
  const nickname = document.getElementById("registerNickname").value.trim();
  const file = document.getElementById("registerPhoto").files[0];

  if (!email) return showMessage("El email es obligatorio", "error");
  if (!validateEmail(email)) return showMessage("Email inválido", "error");

  if (!password) return showMessage("La contraseña es obligatoria", "error");
  if (!validatePassword(password)) {
    return showMessage("La contraseña debe tener al menos 6 caracteres, incluyendo letras y números", "error");
  }

  if (!name) return showMessage("El nombre es obligatorio", "error");
  if (!lastName) return showMessage("El apellido es obligatorio", "error");
  if (!nickname) return showMessage("El apodo es obligatorio", "error");

  if (file) {
    readFileAsBase64(file, async (photoBase64) => {
      await saveUser(email, password, name, lastName, nickname, photoBase64);
    });
  } else {
    await saveUser(email, password, name, lastName, nickname, null);
  }
}

async function saveUser(email, password, name, lastName, nickname, photo) {
  const result = registerUser(email, password, name, lastName, nickname, photo);

  if (result.error) {
    showMessage(result.error, "error");
  } else {
    showMessage("Usuario creado correctamente", "ok");
    showLogin();
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    return showMessage("Por favor completá email y contraseña", "error");
  }

  const result = await loginUser(email, password);

  if (result.error) {
    showMessage(result.error, "error");
  } else {
    showChat();
  }
}

function logout() {
  logoutUser();
  showLogin();
}

async function loadUsers() {
  const users = await getUsers();
  const currentUser = getCurrentUser();
  const container = document.getElementById("usersList");

  container.innerHTML = "";

  users
    .filter(u => u.id !== currentUser.id)
    .forEach(user => {
      container.appendChild(createUserElement(user));
    });
}

function createUserElement(user) {
  const div = document.createElement("div");
  div.classList.add("user-item");

  const photo = user.photo && user.photo !== "undefined"
    ? user.photo
    : "assets/images/foto.png";

  div.innerHTML = `
    <div class="user-info">
      <img src="${photo}">
      <div class="user-text">
        <p><b>@${user.nickname}</b></p>
      </div>
    </div>
  `;

  div.addEventListener("pointerdown", () => startChat(user.id));
  return div;
}

let currentChatUser = null;

function startChat(userId) {
  currentChatUser = userId;
  document.getElementById("chatBox").style.display = "block";
  loadMessages();
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (!text) return showMessage("Escribí un mensaje", "error");
  if (!currentChatUser) return showMessage("Seleccioná un contacto", "error");

  await addMessage(currentChatUser, text);

  input.value = "";
  loadMessages();

  showMessage("Mensaje enviado", "ok");
}

async function loadMessages() {
  const messages = await getMessages();
  const currentUser = getCurrentUser();
  const container = document.getElementById("messages");

  container.innerHTML = "";

  messages
    .filter(m =>
      (m.from === currentUser.id && m.to === currentChatUser) ||
      (m.from === currentChatUser && m.to === currentUser.id)
    )
    .forEach(m => {
      container.appendChild(createMessageElement(m, currentUser));
    });
}

function createMessageElement(m, currentUser) {
  const div = document.createElement("div");
  div.classList.add("message", m.from === currentUser.id ? "me" : "other");
  div.textContent = m.text;
  return div;
}

let hasPhoto = false;

function handlePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  readFileAsBase64(file, (base64) => {
    document.getElementById("photoPreview").src = base64;
    hasPhoto = true;
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

function readFileAsBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
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