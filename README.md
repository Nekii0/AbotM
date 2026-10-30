# AbotM

Abot-Mamamayan community hub: find help, give help, build a stronger community.

**Live site:** https://nekii0.github.io/AbotM/

## Files

- `index.html`: page content
- `style.css`: design
- `script.js`: search box
- `volunteer.html`, `wellness.html`, `education.html`, `donate.html`, `request-help.html`, `community-needs.html`: service pages (replace the green placeholder boxes with your real contacts)

## Adding services (admins)

Admins can sign in at the bottom of any service page (Volunteer, Mental Wellness, etc.) and add, edit or remove that page's **Trusted resources**. They are saved in Firebase (free) and shown to every visitor.

Files: `admin.js` (sign-in and saving), `firebase-config.js` (your project's keys), `firestore.rules` (who can save; paste into Firebase → Firestore → Rules).

One-time setup:

1. Go to https://console.firebase.google.com, click **Add project**, name it `abot-mamamayan`. Google Analytics is optional.
2. **Build → Firestore Database → Create database**, choose a location near the Philippines (e.g. `asia-southeast1`), start in **production mode**.
3. **Firestore → Rules**: paste the contents of `firestore.rules`, replace `YOUR_ADMIN_EMAIL@gmail.com` with your admin Google emails, click **Publish**.
4. **Build → Authentication → Get started → Google**: enable it and save.
5. **Authentication → Settings → Authorized domains**: add `nekii0.github.io`.
6. **Project settings → Your apps → Web (`</>`)**: register an app, copy `apiKey`, `authDomain`, `projectId` and `appId` into `firebase-config.js`, commit and push.

Then on the live site, click **Admin sign in** at the bottom, sign in with an admin Google account, and use **+ Add service**.

To add another admin, add their email to the list in Firestore **Rules** and publish. No code change is needed.

## Publishing

The site is published with GitHub Pages from the `main` branch (**Settings → Pages**).
Every push to `main` updates the live site in about a minute.

When you change `style.css` or `script.js`, raise the number in `style.css?v=7` / `script.js?v=7` in every `.html` file (for example to `v=8`), so visitors' browsers load the new version instead of an old cached copy.

### Update on github.com

1. Open the file you want to change (for example `index.html`).
2. Click the pencil icon and make your edit.
3. Click **Commit changes**.

### Update from your computer

```bash
git add .
git commit -m "Update site"
git push
```
