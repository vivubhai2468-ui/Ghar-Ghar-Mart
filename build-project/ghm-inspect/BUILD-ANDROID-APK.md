# Build a Ghar Ghar Mart Android APK

This project uses Expo / React Native. The source package is prepared with an EAS preview profile that requests an installable Android APK.

## Important
- This ZIP is source code, **not an APK**.
- A real APK has not been built or tested here. Building it requires an Expo account and a cloud build, or a configured local Android SDK.
- The app's live backend/database and required environment variables must be configured for login, product syncing, and orders to work. An APK alone does not host the backend.

## Build an APK with Expo EAS
1. Install Node.js and pnpm on a computer.
2. Unzip this archive and open a terminal in the `ghm-inspect` folder.
3. Run:
   ```sh
   corepack enable
   pnpm install --frozen-lockfile
   npx eas-cli login
   npx eas-cli build:configure
   npx eas-cli build --platform android --profile preview
   ```
4. If prompted, link the project to your Expo account and configure the backend environment variables/secrets for the build and runtime.
5. When the cloud build finishes, open the build URL printed by EAS and download the `.apk` to your Android phone.

The `preview` profile is configured for an APK. The `production` profile is configured for an Android App Bundle (AAB), normally used for Google Play.
