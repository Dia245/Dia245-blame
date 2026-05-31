// ─── CONFIGURACION FIREBASE ──────────────────────────────────────────────────
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto > Authentication > Sign-in method > Phone > Habilitar
// 3. Agrega tu dominio en Authentication > Settings > Authorized domains
// 4. Ve a Project Settings y copia tu firebaseConfig aqui abajo

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "es";

// ─── ESTADO ──────────────────────────────────────────────────────────────────
let confirmationResult = null;
let resendInterval     = null;

// ─── RECAPTCHA (invisible) ────────────────────────────────────────────────────
function setupRecaptcha() {
  if (window.recaptchaVerifier) return;
  window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      window.recaptchaVerifier = null;
    },
  });
}

// ─── PASO 1: ENVIAR OTP ───────────────────────────────────────────────────────
window.sendOTP = async function () {
  const code  = document.getElementById("country-code").value;
  const raw   = document.getElementById("phone-input").value.replace(/\s/g, "");
  const phone = code + raw;
  const errEl = document.getElementById("error-phone");
  const btn   = document.getElementById("btn-send");

  errEl.textContent = "";

  if (raw.length < 7) {
    errEl.textContent = "Ingresa un numero valido.";
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.textContent = "Enviando";

  try {
    setupRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);

    document.getElementById("phone-display").textContent = phone;
    show("step-otp");
    setupOTPInputs();
    startResendTimer(60);
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
    window.recaptchaVerifier = null;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.textContent = "Enviar codigo";
  }
};

// ─── PASO 2: VERIFICAR OTP ────────────────────────────────────────────────────
window.verifyOTP = async function () {
  const boxes  = document.querySelectorAll(".otp-box");
  const code   = Array.from(boxes).map(b => b.value).join("");
  const errEl  = document.getElementById("error-otp");
  const btn    = document.getElementById("btn-verify");

  errEl.textContent = "";

  if (code.length < 6) {
    errEl.textContent = "Ingresa los 6 digitos del codigo.";
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.textContent = "Verificando";

  try {
    const result = await confirmationResult.confirm(code);
    const user   = result.user;

    document.getElementById("user-uid").textContent = user.uid;
    show("step-success");
    clearInterval(resendInterval);

    // Aqui puedes enviar el token a tu backend:
    // const idToken = await user.getIdToken();
    // await fetch('/api/verify-token', { method:'POST', body: JSON.stringify({ idToken }) });

  } catch (err) {
    errEl.textContent = friendlyError(err.code);
    boxes.forEach(b => { b.value = ""; b.classList.remove("filled"); });
    boxes[0].focus();
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.textContent = "Verificar";
  }
};

// ─── REENVIAR ─────────────────────────────────────────────────────────────────
window.resendOTP = async function () {
  show("step-phone");
  clearInterval(resendInterval);
  document.getElementById("resend-timer").textContent = "";
  window.recaptchaVerifier = null;
};

function startResendTimer(seconds) {
  const btn   = document.querySelector(".btn-secondary");
  const timer = document.getElementById("resend-timer");
  let left    = seconds;

  btn.disabled = true;
  timer.textContent = `(${left}s)`;

  resendInterval = setInterval(() => {
    left--;
    timer.textContent = `(${left}s)`;
    if (left <= 0) {
      clearInterval(resendInterval);
      btn.disabled = false;
      timer.textContent = "";
    }
  }, 1000);
}

// ─── OTP INPUT — navegacion automatica ───────────────────────────────────────
function setupOTPInputs() {
  const boxes = document.querySelectorAll(".otp-box");

  boxes.forEach((box, i) => {
    box.value = "";
    box.classList.remove("filled");

    box.addEventListener("input", () => {
      const val = box.value.replace(/\D/g, "");
      box.value = val.slice(-1);
      box.classList.toggle("filled", box.value !== "");
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });

    box.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        boxes[i - 1].value = "";
        boxes[i - 1].classList.remove("filled");
        boxes[i - 1].focus();
      }
    });

    box.addEventListener("paste", e => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      text.split("").forEach((ch, j) => {
        if (boxes[j]) {
          boxes[j].value = ch;
          boxes[j].classList.add("filled");
        }
      });
      boxes[Math.min(text.length, boxes.length - 1)].focus();
    });
  });

  boxes[0].focus();
}

// ─── RESET ────────────────────────────────────────────────────────────────────
window.resetFlow = function () {
  clearInterval(resendInterval);
  window.recaptchaVerifier = null;
  document.getElementById("phone-input").value = "";
  document.getElementById("error-phone").textContent = "";
  show("step-phone");
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function show(stepId) {
  ["step-phone", "step-otp", "step-success"].forEach(id => {
    document.getElementById(id).classList.toggle("hidden", id !== stepId);
  });
}

function friendlyError(code) {
  const msgs = {
    "auth/invalid-phone-number":    "Numero de telefono invalido.",
    "auth/too-many-requests":       "Demasiados intentos. Espera unos minutos.",
    "auth/quota-exceeded":          "Cuota de SMS superada. Intenta mas tarde.",
    "auth/invalid-verification-code": "Codigo incorrecto. Verifica e intenta de nuevo.",
    "auth/code-expired":            "El codigo expiro. Solicita uno nuevo.",
    "auth/network-request-failed":  "Error de red. Revisa tu conexion.",
  };
  return msgs[code] || `Error inesperado (${code}).`;
}
