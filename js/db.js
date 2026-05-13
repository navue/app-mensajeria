const DB_NAME = "messagingDB";
const DB_VERSION = 1;

let db;

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  // USERS
  if (!db.objectStoreNames.contains("users")) {
    const usersStore = db.createObjectStore("users", {
      keyPath: "id"
    });

    usersStore.createIndex("email", "email", { unique: true });
  }

  // MESSAGES
  if (!db.objectStoreNames.contains("messages")) {
    db.createObjectStore("messages", {
      keyPath: "id",
      autoIncrement: true
    });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  console.log("IndexedDB lista");
};

request.onerror = () => {
  console.error("Error abriendo IndexedDB");
};

function getUsers() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function registerUser(email, password, name, lastName, nickname, photo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");

    const emailIndex = store.index("email");
    const checkRequest = emailIndex.get(email);

    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        resolve({ error: "Email ya registrado" });
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        name,
        lastName,
        nickname,
        photo,
        status: "Disponible",
        createdAt: new Date().toISOString()
      };

      store.add(newUser);

      resolve({ success: true });
    };

    checkRequest.onerror = () => {
      reject({ error: "Error registrando usuario" });
    };
  });
}

async function loginUser(email, password) {
  const users = await getUsers();

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return { error: "Credenciales incorrectas" };
  }

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
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly");
    const store = tx.objectStore("messages");

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject([]);
  });
}

function addMessage(toUserId, text) {
  return new Promise((resolve, reject) => {
    const currentUser = getCurrentUser();

    const tx = db.transaction("messages", "readwrite");
    const store = tx.objectStore("messages");

    const message = {
      from: currentUser.id,
      to: toUserId,
      text,
      date: new Date().toISOString()
    };

    const request = store.add(message);

    request.onsuccess = () => resolve();
    request.onerror = () => reject();
  });
}