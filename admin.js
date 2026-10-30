import { firebaseConfig } from "./firebase-config.js?v=4";

const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const grid = document.getElementById("grid");
const addBtn = document.getElementById("add-service");
const adminLink = document.getElementById("admin-link");
const dialog = document.getElementById("service-dialog");
const form = document.getElementById("service-form");
const formError = document.getElementById("form-error");
const saveBtn = document.getElementById("save-service");

// Only web links and phone numbers; blocks javascript: and other unsafe links.
const safeLink = v => /^(https?:\/\/\S+|tel:\+?[0-9 -]+)$/i.test(v) ? v : "";

function card(id, s, canEdit, onEdit, onRemove) {
  const el = document.createElement("div");
  el.className = "card added";
  el.innerHTML = '<svg viewBox="0 0 24 24" stroke="#3f6b52" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg><h3></h3><p></p>';
  const h3 = el.querySelector("h3"), link = safeLink(s.link || "");
  if (link) {
    const a = document.createElement("a");
    a.href = link;
    a.textContent = s.title;
    if (link.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
    h3.append(a);
  } else h3.textContent = s.title;
  el.querySelector("p").textContent = s.description;
  if (canEdit) {
    const tools = document.createElement("div");
    tools.className = "card-tools";
    const btn = (label, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "link-btn";
      b.textContent = label;
      b.setAttribute("aria-label", `${label} ${s.title}`);
      b.onclick = fn;
      tools.append(b);
    };
    btn("Edit", () => onEdit(id, s));
    btn("Remove", () => confirm(`Remove "${s.title}" for everyone?`) && onRemove(id));
    el.append(tools);
  }
  return el;
}

if (firebaseConfig.apiKey) {
  const { initializeApp } = await import(CDN + "firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import(CDN + "firebase-auth.js");
  const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } = await import(CDN + "firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const services = collection(getFirestore(app), "services");
  let docs = [], user = null, editingId = null;
  const dialogTitle = document.getElementById("dialog-title");

  const open = (id, s) => {
    editingId = id;
    form.reset();
    formError.textContent = "";
    dialogTitle.textContent = id ? "Edit service" : "Add a service";
    if (s) for (const k of ["title", "description", "link"]) form.elements[k].value = s[k] || "";
    dialog.showModal();
  };
  const remove = id => deleteDoc(doc(services, id)).catch(e => alert(explain(e)));
  const render = () => {
    grid.querySelectorAll(".card.added").forEach(c => c.remove());
    for (const d of docs) grid.append(card(d.id, d.data(), !!user, open, remove));
  };
  const explain = e => e.code === "permission-denied"
    ? "This account isn't an admin. Ask the site owner to add your email to the Firebase rules."
    : "Couldn't save. Check your connection and try again.";

  onSnapshot(query(services, orderBy("createdAt")), snap => { docs = snap.docs; render(); },
    () => console.warn("Could not load added services"));

  adminLink.hidden = false;
  onAuthStateChanged(auth, u => {
    user = u;
    addBtn.hidden = !u;
    adminLink.textContent = u ? `Sign out (${u.email})` : "Admin sign in";
    render();
  });
  adminLink.onclick = () => user ? signOut(auth) : signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {});

  addBtn.onclick = () => open(null);
  document.getElementById("cancel-service").onclick = () => dialog.close();
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const s = { title: f.get("title").trim(), description: f.get("description").trim(), link: f.get("link").trim() };
    if (!s.title || !s.description) { formError.textContent = "Add a name and a short description."; return; }
    if (s.link && !safeLink(s.link)) { formError.textContent = "Link must start with https:// or tel:"; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      if (editingId) await updateDoc(doc(services, editingId), s);
      else await addDoc(services, { ...s, createdAt: serverTimestamp() });
      dialog.close();
    } catch (err) {
      formError.textContent = explain(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save service";
    }
  };
}
