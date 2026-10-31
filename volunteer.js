// "Sign up to volunteer" button on volunteer.html: opens the sign-up form in a dialog.
const dialog = document.getElementById("signup-dialog");
document.getElementById("signup-open").onclick = () => dialog.showModal();
document.getElementById("signup-cancel").onclick = () => dialog.close();
// Clicking the dark backdrop outside the form closes it too.
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
