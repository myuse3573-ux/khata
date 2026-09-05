# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)

## Runtime configuration

The API uses MongoDB for accounts and application data. Set `MONGODB_URI` before starting the server. `DATABASE_URL` is not used by the current API.

For Google sign-in, enable Google as a Firebase Authentication provider and set the `VITE_FIREBASE_*` web credentials for the client plus `FIREBASE_WEB_API_KEY` for the API. The API verifies the Firebase identity before creating a MongoDB user and JWT session.

For local Docker development, run `docker compose up --build` to start MongoDB and the API together. In production, provide a reachable MongoDB Atlas or other MongoDB connection string in the deployment environment.
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
