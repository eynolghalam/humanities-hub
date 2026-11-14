# Architecture rules

- Book covers use a private Cloud Storage bucket with signed URLs and book-scoped educator write policies; this preserves workspace storage privacy and existing book permissions.
- Home-screen installation uses manifest-only metadata and browser-native installation prompts, without an app-shell service worker, because offline support is not requested.