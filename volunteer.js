import { firebaseConfig } from "./firebase-config.js?v=7";

// "Sign up to volunteer" on volunteer.html: the button opens the form in a dialog, sign-ups are saved
// to the "volunteers" collection in Firebase, and admins see the list under the button.
const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const dialog = document.getElementById("signup-dialog");
const form = document.getElementById("volunteer-form");
const formError = document.getElementById("volunteer-error");
const done = document.getElementById("volunteer-done");
const sendBtn = form.querySelector("button[type=submit]");

document.getElementById("signup-open").onclick = () => {
  form.hidden = false;
  done.hidden = true;
  formError.textContent = "";
  dialog.showModal();
};
document.getElementById("signup-cancel").onclick = () => dialog.close();
// Clicking the dark backdrop outside the form closes it too.
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

// Firebase loads in the background; sending waits for it, so a fast click never reloads the page.
const fb = (async () => {
  const { initializeApp, getApps } = await import(CDN + "firebase-app.js");
  const auth = await import(CDN + "firebase-auth.js");
  const store = await import(CDN + "firebase-firestore.js");
  // admin.js may have started Firebase already.
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const db = store.getFirestore(app);
  return { app, auth, store, volunteers: store.collection(db, "volunteers") };
})();

form.onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(form);
  const s = {
    name: f.get("name").trim(), barangay: f.get("barangay").trim(), contact: f.get("contact").trim(),
    availability: f.get("availability"), interests: f.getAll("interests"), note: f.get("note").trim(),
  };
  if (!s.name || !s.barangay || !s.contact) { formError.textContent = "Fill in your name, barangay and phone or email."; return; }
  if (!s.interests.length) { formError.textContent = "Choose at least one way you'd like to help."; return; }
  formError.textContent = "";
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";
  try {
    const { store, volunteers } = await fb;
    await store.addDoc(volunteers, { ...s, createdAt: store.serverTimestamp() });
    form.reset();
    form.hidden = true;
    done.hidden = false;
  } catch {
    formError.textContent = "Couldn't send your sign-up. Check your connection and try again.";
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send sign-up";
  }
};

// Admins: list of sign-ups. The Firebase rules only let admins read them, so for everyone else
// the listener is refused and the section stays hidden.
const box = document.getElementById("signups");
const list = document.getElementById("signups-list");
let stop = null;
const contactLink = c => /^[+(]?[0-9][0-9 ().-]{5,}$/.test(c) ? "tel:" + c.replace(/[^0-9+]/g, "")
  : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? "mailto:" + c : "";

const row = d => {
  const s = d.data(), li = document.createElement("li");
  const h3 = document.createElement("h3");
  h3.textContent = `${s.name} · ${s.barangay}`;
  const p = document.createElement("p");
  const when = s.createdAt ? s.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "just now";
  p.textContent = `${s.interests.join(", ")} · ${s.availability} · signed up ${when}`;
  li.append(h3, p);
  if (s.note) {
    const note = document.createElement("p");
    note.textContent = `“${s.note}”`;
    li.append(note);
  }
  const link = contactLink(s.contact);
  const a = document.createElement(link ? "a" : "span");
  a.className = "res-link";
  if (link) a.href = link;
  a.textContent = (link.startsWith("tel:") ? "Call " : link ? "Email " : "") + s.contact;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "link-btn";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove ${s.name}'s sign-up`);
  remove.onclick = () => confirm(`Remove ${s.name}'s sign-up?`) && fb.then(({ store, volunteers }) => store.deleteDoc(store.doc(volunteers, d.id))).catch(() => alert("Couldn't remove it. Try again."));
  const tools = document.createElement("div");
  tools.className = "res-tools";
  tools.append(a, remove);
  li.append(tools);
  return li;
};

fb.then(({ app, auth, store, volunteers }) => auth.onAuthStateChanged(auth.getAuth(app), u => {
  stop?.();
  stop = null;
  box.hidden = true;
  if (!u) return;
  stop = store.onSnapshot(volunteers, snap => {
    const docs = snap.docs.sort((a, b) => (b.data().createdAt?.seconds ?? Infinity) - (a.data().createdAt?.seconds ?? Infinity));
    list.replaceChildren(...docs.map(row));
    document.getElementById("signups-empty").hidden = docs.length > 0;
    box.hidden = false;
  }, () => { box.hidden = true; });
}), () => console.warn("Could not load Firebase"));
