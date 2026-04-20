// Users
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// Register
function registerUser(email, password, name, lastName, nickname, photo) {
  const users = getUsers();

  const existsEmail = users.find(u => u.email === email);
  if (existsEmail) return { error: "Email ya registrado" };

  const newUser = {
    id: Date.now().toString(),
    email,
    password,
    name,
    lastName,
    nickname,
    photo, // base64
    status: "Disponible", // default
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true };
}

// Login
function loginUser(email, password) {
  const users = getUsers();

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return { error: "Credenciales incorrectas" };

  localStorage.setItem("currentUser", JSON.stringify(user));

  return { success: true };
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function logoutUser() {
  localStorage.removeItem("currentUser");
}

function getMessages() {
  return JSON.parse(localStorage.getItem("messages")) || [];
}

function saveMessages(messages) {
  localStorage.setItem("messages", JSON.stringify(messages));
}

function addMessage(toUserId, text) {
  const messages = getMessages();
  const currentUser = getCurrentUser();

  messages.push({
    from: currentUser.id,
    to: toUserId,
    text,
    date: new Date().toISOString()
  });

  saveMessages(messages);
}