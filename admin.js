import { firebaseConfig } from "./firebase-config.js?v=7";

// Any <section data-page="..."> becomes a list admins can add to: contacts on service pages,
// announcements and events on the homepage. All are stored in the "resources" collection by page.
const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
const PAGES = ["volunteer", "wellness", "education", "donate", "request-help", "community-needs", "announcements", "events"];
const CONTACTS = { heading: "Contacts and links", noun: "contact or link", empty: "No contacts yet. Add the first one.",
  name: "e.g. Baguio General Hospital psychiatry", desc: "Short description", descHint: "What it offers, who it's for, hours" };
const TEXT = {
  announcements: { heading: "Announcements", noun: "announcement", empty: "No announcements yet.", newestFirst: true,
    name: "e.g. Relief drive this Saturday", desc: "Details", descHint: "What's happening and what people should do" },
  events: { heading: "Upcoming events", noun: "event", empty: "No upcoming events yet.",
    name: "e.g. Burnham Park clean-up", desc: "When and where", descHint: "e.g. Sat, Nov 8 · 7 AM · Burnham Park" },
};
const boxes = [...document.querySelectorAll("section[data-page]")].filter(b => PAGES.includes(b.dataset.page));

// Only web links and phone numbers; blocks javascript: and other unsafe links.
const safeLink = v => /^(https?:\/\/\S+|tel:\+?[0-9 -]+)$/i.test(v) ? v : "";
// Turns what people type ("0917 123 4567", "(074) 661-1455", "redcross.org.ph") into a tel: or https:// link.
const toLink = v => /^[+(]?[0-9][0-9 ().-]{5,}$/.test(v) ? "tel:" + v.replace(/[^0-9+]/g, "")
  : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? "https://" + v : v;

if (firebaseConfig.apiKey && boxes.length) {
  const { initializeApp } = await import(CDN + "firebase-app.js");
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import(CDN + "firebase-auth.js");
  const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } = await import(CDN + "firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const resources = collection(getFirestore(app), "resources");
  let docs = [], user = null, editing = null;

  document.body.insertAdjacentHTML("beforeend", `<dialog id="res-dialog" aria-labelledby="res-title">
    <form id="res-form">
      <h2 id="res-title"></h2>
      <label>Name <input name="title" required maxlength="60"></label>
      <label><span id="res-desc-label"></span> <textarea name="description" required maxlength="140" rows="3"></textarea></label>
      <label>Phone or website (optional) <input name="link" maxlength="300" placeholder="0917 123 4567 or redcross.org.ph"></label>
      <p class="form-error" id="res-error" role="alert"></p>
      <div class="dialog-actions">
        <button type="button" class="btn ghost" id="res-cancel">Cancel</button>
        <button type="submit" class="btn" id="res-save">Save</button>
      </div>
    </form>
  </dialog>`);
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

  const open = (page, id, s) => {
    const t = TEXT[page] || CONTACTS;
    editing = { page, id };
    form.reset();
    formError.textContent = "";
    document.getElementById("res-title").textContent = (id ? "Edit " : "Add ") + t.noun;
    document.getElementById("res-desc-label").textContent = t.desc;
    form.elements.title.placeholder = t.name;
    form.elements.description.placeholder = t.descHint;
    if (s) for (const k of ["title", "description", "link"]) form.elements[k].value = (s[k] || "").replace(/^tel:/, "");
    dialog.showModal();
  };

  const item = (page, id, s) => {
    const li = document.createElement("li");
    const h3 = document.createElement("h3"), link = safeLink(s.link || "");
    h3.textContent = s.title;
    const p = document.createElement("p");
    p.textContent = s.description;
    li.append(h3, p);
    if (link) {
      // Show the number or site itself, so visitors see who they're contacting before tapping.
      const a = document.createElement("a");
      a.className = "res-link";
      a.href = link;
      if (link.startsWith("tel:")) a.textContent = "Call " + link.slice(4);
      else {
        a.textContent = "Visit " + new URL(link).hostname.replace(/^www\./, "");
        a.target = "_blank";
        a.rel = "noopener";
      }
      li.append(a);
    }
    if (user) {
      const tools = document.createElement("div");
      tools.className = "res-tools";
      for (const [label, fn] of [["Edit", () => open(page, id, s)],
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

  for (const box of boxes) {
    const t = TEXT[box.dataset.page] || CONTACTS;
    box.innerHTML = `<h2></h2><ul class="resources"></ul><p class="res-empty" hidden></p>
      <button type="button" class="btn add-btn" hidden></button>`;
    box.querySelector("h2").textContent = t.heading;
    box.querySelector(".res-empty").textContent = t.empty;
    box.querySelector(".add-btn").textContent = "+ Add " + t.noun;
    box.querySelector(".add-btn").onclick = () => open(box.dataset.page, null);
  }

  const render = () => {
    for (const box of boxes) {
      const page = box.dataset.page;
      // Sorted here instead of in the query, so Firestore needs no extra index.
      const mine = docs.filter(d => d.data().page === page)
        .sort((a, b) => (a.data().createdAt?.seconds ?? Infinity) - (b.data().createdAt?.seconds ?? Infinity));
      if (TEXT[page]?.newestFirst) mine.reverse();
      box.querySelector(".resources").replaceChildren(...mine.map(d => item(page, d.id, d.data())));
      box.hidden = !mine.length && !user;
      box.querySelector(".res-empty").hidden = !!mine.length;
      box.querySelector(".add-btn").hidden = !user;
    }
  };

  onSnapshot(query(resources, where("page", "in", boxes.map(b => b.dataset.page))), snap => {
    docs = snap.docs;
    render();
  }, () => console.warn("Could not load lists"));

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
  // Google sign-in fails inside Facebook/Messenger/Instagram's built-in browsers.
  const inAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\//i.test(navigator.userAgent);
  adminLink.onclick = () => user ? signOut(auth)
    : inAppBrowser ? alert("Sign-in doesn't work inside Messenger or Facebook. Tap ⋯ (top right) → Open in Chrome (or Open in browser), then tap Admin sign in again.")
    : signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
    // Closing the window yourself isn't an error worth showing.
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request")
      alert(signInError[e.code] || `Sign-in failed (${e.code}). Try again.`);
  });

  document.getElementById("res-cancel").onclick = () => dialog.close();
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const s = { title: f.get("title").trim(), description: f.get("description").trim(), link: toLink(f.get("link").trim()) };
    if (!s.title || !s.description) { formError.textContent = "Fill in both the name and the details."; return; }
    if (s.link && !safeLink(s.link)) { formError.textContent = "Enter a phone number (like 0917 123 4567) or a website (like redcross.org.ph)."; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      if (editing.id) await updateDoc(doc(resources, editing.id), s);
      else await addDoc(resources, { ...s, page: editing.page, createdAt: serverTimestamp() });
      dialog.close();
    } catch (err) {
      formError.textContent = explain(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  };
}
