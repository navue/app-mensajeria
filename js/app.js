window.onload = () => {
  const user = getCurrentUser();

  if (user) {
    showChat();
  } else {
    showLogin();
  }

  const input = document.getElementById("registerPhoto");

  if (input) {
    input.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = function (e) {
        const img = document.getElementById("photoPreview");
        img.src = e.target.result;

        hasPhoto = true;
      };

      reader.readAsDataURL(file);
    });
  }
  
};

// Vistas
function showRegister() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("registerView").style.display = "block";
}

function showLogin() {
  document.getElementById("loginView").style.display = "block";
  document.getElementById("registerView").style.display = "none";
  document.getElementById("chatView").style.display = "none";
}

function showChat() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("chatView").style.display = "block";

  loadUsers();
}

// Auth
function register() {
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const name = document.getElementById("registerName").value;
  const lastName = document.getElementById("registerLastName").value;
  const nickname = document.getElementById("registerNickname").value;

  const photoInput = document.getElementById("registerPhoto");
  const file = photoInput.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function () {
      const photoBase64 = reader.result;

      saveUser(email, password, name, lastName, nickname, photoBase64);
    };

    reader.readAsDataURL(file);
  } else {
    saveUser(email, password, name, lastName, nickname, null);
  }
}

function saveUser(email, password, name, lastName, nickname, photo) {
  const result = registerUser(email, password, name, lastName, nickname, photo);

  if (result.error) {
    alert(result.error);
  } else {
    alert("Usuario creado correctamente");
    showLogin();
  }
}

function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Por favor completá email y contraseña");
    return;
  }

  const result = loginUser(email, password);

  if (result.error) {
    alert(result.error);
  } else {
    showChat();
  }
}

function logout() {
  logoutUser();
  showLogin();
}

function loadUsers() {
  const users = getUsers();
  const currentUser = getCurrentUser();

  const container = document.getElementById("usersList");
  container.innerHTML = "";

  users
    .filter(u => u.id !== currentUser.id)
    .forEach(user => {
      const div = document.createElement("div");

      div.classList.add("user-item");

      const photo = (user.photo && user.photo !== "undefined" && user.photo !== "")
        ? user.photo
        : "assets/images/foto.png";

      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <img src="${photo}" 
                style="width:40px; height:40px; border-radius:50%; object-fit:cover;">

            <div>
            <p><b>${user.name} ${user.lastName}</b></p>
            <p>@${user.nickname}</p>
            </div>

            <button onclick="startChat('${user.id}')">Chat</button>
        </div>
        `;

      container.appendChild(div);
    });
}

let currentChatUser = null;

function startChat(userId, email) {
  currentChatUser = userId;

  document.getElementById("chatBox").style.display = "block";
  loadMessages();
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value;

  if (!text) return;

  addMessage(currentChatUser, text);
  input.value = "";

  loadMessages();
}

function loadMessages() {
  const messages = getMessages();
  const currentUser = getCurrentUser();

  const container = document.getElementById("messages");
  container.innerHTML = "";

  messages
    .filter(m =>
      (m.from === currentUser.id && m.to === currentChatUser) ||
      (m.from === currentChatUser && m.to === currentUser.id)
    )
    .forEach(m => {
      const div = document.createElement("div");

      div.textContent =
        (m.from === currentUser.id ? "Yo: " : "Otro: ") + m.text;

      container.appendChild(div);
    });
}

let hasPhoto = false;

function handlePhotoClick() {
  const input = document.getElementById("registerPhoto");

  if (input.files && input.files.length > 0) {
    removePhoto();
  } else {
    input.click();
  }
}

function removePhoto() {
  const img = document.getElementById("photoPreview");
  const input = document.getElementById("registerPhoto");

  img.src = "assets/images/foto.png";
  input.value = "";
}

function showChat() {
  document.getElementById("loginView").style.display = "none";
  document.getElementById("registerView").style.display = "none";
  document.getElementById("chatView").style.display = "block";

  document.querySelector(".app-container").classList.add("chat-mode");

  loadUsers();
}

function showLogin() {
  document.getElementById("loginView").style.display = "block";
  document.getElementById("registerView").style.display = "none";
  document.getElementById("chatView").style.display = "none";

  document.querySelector(".app-container").classList.remove("chat-mode");
}