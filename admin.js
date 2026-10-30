import { firebaseConfig } from "./firebase-config.js?v=7";

// Each service page has <section id="resources" data-page="..."> where admins add resources.
const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const PAGES = ["volunteer", "wellness", "education", "donate", "request-help", "community-needs"];
const box = document.getElementById("resources");
const page = box?.dataset.page;

// Only web links and phone numbers; blocks javascript: and other unsafe links.
const safeLink = v => /^(https?:\/\/\S+|tel:\+?[0-9 -]+)$/i.test(v) ? v : "";

if (firebaseConfig.apiKey && PAGES.includes(page)) {
  const { initializeApp } = await import(CDN + "firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import(CDN + "firebase-auth.js");
  const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } = await import(CDN + "firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const resources = collection(getFirestore(app), "resources");
  let items = [], user = null, editingId = null;

  box.innerHTML = `<h2>Trusted resources</h2>
    <ul class="resources" id="res-list"></ul>
    <p class="res-empty" id="res-empty" hidden>No resources yet. Add the first one.</p>
    <button type="button" class="btn add-btn" id="add-res" hidden>+ Add resource</button>`;
  document.body.insertAdjacentHTML("beforeend", `<dialog id="res-dialog" aria-labelledby="res-title">
    <form id="res-form">
      <h2 id="res-title">Add a resource</h2>
      <label>Name <input name="title" required maxlength="60" placeholder="e.g. Baguio General Hospital psychiatry"></label>
      <label>Short description <textarea name="description" required maxlength="140" rows="3" placeholder="What it offers, who it's for, hours"></textarea></label>
      <label>Link or phone (optional) <input name="link" maxlength="300" placeholder="https://… or tel:+6374…"></label>
      <p class="form-error" id="res-error" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn ghost" id="res-cancel">Cancel</button>
        <button type="submit" class="btn" id="res-save">Save resource</button>
      </div>
    </form>
  </dialog>`);
  const list = document.getElementById("res-list");
  const empty = document.getElementById("res-empty");
  const addBtn = document.getElementById("add-res");
  const dialog = document.getElementById("res-dialog");
  const form = document.getElementById("res-form");
  const formError = document.getElementById("res-error");
  const saveBtn = document.getElementById("res-save");
  const adminLink = document.createElement("button");
  adminLink.type = "button";
  adminLink.className = "link-btn";
  document.querySelector("footer").append(" ", adminLink);

  const explain = e => e.code === "permission-denied"
    ? "This account isn't an admin. Ask the site owner to add your email to the Firebase rules."
    : "Couldn't save. Check your connection and try again.";

  const open = (id, s) => {
    editingId = id;
    form.reset();
    formError.textContent = "";
    document.getElementById("res-title").textContent = id ? "Edit resource" : "Add a resource";
    if (s) for (const k of ["title", "description", "link"]) form.elements[k].value = s[k] || "";
    dialog.showModal();
  };

  const item = (id, s) => {
    const li = document.createElement("li");
    const h3 = document.createElement("h3"), link = safeLink(s.link || "");
    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.textContent = s.title;
      if (link.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
      h3.append(a);
    } else h3.textContent = s.title;
    const p = document.createElement("p");
    p.textContent = s.description;
    li.append(h3, p);
    if (user) {
      const tools = document.createElement("div");
      tools.className = "res-tools";
      for (const [label, fn] of [["Edit", () => open(id, s)],
        ["Remove", () => confirm(`Remove "${s.title}" for everyone?`) && deleteDoc(doc(resources, id)).catch(e => alert(explain(e)))]]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "link-btn";
        b.textContent = label;
        b.setAttribute("aria-label", `${label} ${s.title}`);
        b.onclick = fn;
        tools.append(b);
      }
      li.append(tools);
    }
    return li;
  };

  const render = () => {
    list.replaceChildren(...items.map(d => item(d.id, d.data())));
    box.hidden = !items.length && !user;
    empty.hidden = !!items.length;
    addBtn.hidden = !user;
  };

  // Sorted here instead of in the query, so Firestore needs no extra index.
  onSnapshot(query(resources, where("page", "==", page)), snap => {
    items = snap.docs.sort((a, b) => (a.data().createdAt?.seconds ?? Infinity) - (b.data().createdAt?.seconds ?? Infinity));
    render();
  }, () => console.warn("Could not load resources"));

  onAuthStateChanged(auth, u => {
    user = u;
    adminLink.textContent = u ? `Sign out (${u.email})` : "Admin sign in";
    render();
  });
  const signInError = {
    "auth/unauthorized-domain": `Sign-in isn't allowed on ${location.hostname} yet. In Firebase → Authentication → Settings → Authorized domains, add ${location.hostname}.`,
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
    "auth/operation-not-allowed": "Google sign-in is turned off. In Firebase → Authentication → Sign-in method, enable Google.",
  };
  adminLink.onclick = () => user ? signOut(auth) : signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
    // Closing the window yourself isn't an error worth showing.
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request")
      alert(signInError[e.code] || `Sign-in failed (${e.code}). Try again.`);
  });

  addBtn.onclick = () => open(null);
  document.getElementById("res-cancel").onclick = () => dialog.close();
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const s = { title: f.get("title").trim(), description: f.get("description").trim(), link: f.get("link").trim() };
    if (!s.title || !s.description) { formError.textContent = "Add a name and a short description."; return; }
    if (s.link && !safeLink(s.link)) { formError.textContent = "Link must start with https:// or tel:"; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      if (editingId) await updateDoc(doc(resources, editingId), s);
      else await addDoc(resources, { ...s, page, createdAt: serverTimestamp() });
      dialog.close();
    } catch (err) {
      formError.textContent = explain(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save resource";
    }
  };
}
