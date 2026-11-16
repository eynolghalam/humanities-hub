# Architecture rules

- Book covers use a private Cloud Storage bucket with signed URLs and a database trigger guarding cover-path changes; this enforces cover permissions independently of general book editing.
- Home-screen installation uses manifest-only metadata and browser-native installation prompts, without an app-shell service worker, because offline support is not requested.
- Uploaded display images are resized and encoded before storage using shared role-specific presets; originals are not stored to avoid unnecessary storage use.
- Branding uses one site-settings asset bundle for all marks, favicon and a dynamic installation manifest, so an admin update changes every surface.
- Book-source answering uses an authenticated streaming server route with native Responses image/PDF inputs and server-read, RLS-scoped book text; browser-supplied source text is never trusted.