const firebaseScripts = [
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore-compat.js",
];

let firebaseReady = false;
let firestore;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = src;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function initFirebase() {
  if (firebaseReady) return;

  for (const src of firebaseScripts) {
    await loadScript(src);
  }

  const firebaseConfig = {
    apiKey: "AIzaSyB8RZcaaFCKEMJmX7Ue5DlTB2piFCk2j3Q",
    authDomain: "app-mensajeria-a7ad3.firebaseapp.com",
    projectId: "app-mensajeria-a7ad3",
    storageBucket: "app-mensajeria-a7ad3.firebasestorage.app",
    messagingSenderId: "40584117129",
    appId: "1:40584117129:web:a50eb84a90e50c8982bf58",
    measurementId: "G-NQME1VK9V6",
  };

  firebase.initializeApp(firebaseConfig);

  firestore = firebase.firestore();

  firestore.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("La persistencia falló: Múltiples pestañas abiertas.");
    } else if (err.code == 'unimplemented') {
      console.warn("El navegador no soporta persistencia offline.");
    } else {
      console.error("Error al activar persistencia offline de Firestore:", err.code);
    }
  });

  firebaseReady = true;

  console.log("Firebase listo");
}

// ---------------- USERS ----------------

async function getUsers() {
  const snapshot = await firestore.collection("users").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    delete data.password;

    return {
      id: doc.id,
      ...data,
    };
  });
}

async function getUsersWithPassword() {
  const snapshot = await firestore.collection("users").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function registerUser(email, password, name, lastName, nickname, photo) {
  const users = await getUsers();

  const existsEmail = users.find((u) => u.email === email);

  if (existsEmail) {
    return { error: "Email ya registrado" };
  }

  await firestore.collection("users").add({
    email,
    password,
    name,
    lastName,
    nickname,
    photo,
    status: "Disponible",
    createdAt: new Date().toISOString(),
  });

  return { success: true };
}

async function updateUser(userId, updatedData) {
  await firestore.collection("users").doc(userId).update(updatedData);

  return { success: true };
}

async function deleteUser(userId) {
  await firestore.collection("users").doc(userId).delete();

  return { success: true };
}

// ---------------- LOGIN ----------------

async function loginUser(email, password) {
  const users = await getUsersWithPassword();

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return { error: "Credenciales incorrectas" };
  }

  localStorage.setItem(
    "currentUser",
    JSON.stringify({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    }),
  );

  return { success: true };
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

function logoutUser() {
  localStorage.removeItem("currentUser");
}

// ---------------- MESSAGES ----------------

async function getMessages() {
  const snapshot = await firestore
    .collection("messages")
    .orderBy("createdAt")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function addMessage(toUserId, text) {
  const currentUser = getCurrentUser();

  await firestore.collection("messages").add({
    from: currentUser.id,
    to: toUserId,
    text,
    createdAt: Date.now(),
    read: false,
  });

  return { success: true };
}

async function updateMessage(messageId, updatedText) {
  await firestore.collection("messages").doc(messageId).update({
    text: updatedText,
    edited: true,
    editedAt: Date.now(),
  });
}

async function deleteMessage(messageId) {
  await firestore.collection("messages").doc(messageId).delete();

  return { success: true };
}

async function markMessagesAsRead(fromUserId) {
  const currentUser = getCurrentUser();

  const snapshot = await firestore
    .collection("messages")
    .where("from", "==", fromUserId)
    .where("to", "==", currentUser.id)
    .where("read", "==", false)
    .get();

  const batch = firestore.batch();

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      readAt: Date.now(),
    });
  });

  await batch.commit();
}

function subscribeToMessages(callback) {
  return firestore
    .collection("messages")
    .orderBy("createdAt")
    .onSnapshot((snapshot) => {
      const messages = [];

      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      callback(messages);
    });
}
