# NextDay Desktop Application (Tauri v2)

NextDay Desktop is a lightweight, high-performance desktop wrapper around the NextDay web client powered by Tauri v2 and Rust.

## Native Rust Capabilities Provided
1. `secure_save_token(key, token)` - Stores sensitive session tokens into local secure storage.
2. `secure_get_token(key)` - Securely retrieves stored credentials on launch.
3. `export_csv_to_downloads(filename, content)` - One-click export of payroll, candidate, and attendance reports directly to the user's OS `Downloads` folder.

## Prerequisites
- Rust & Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` or `rustup` on Windows)
- Node.js 20+

## Development & Build Commands
```bash
# In apps/desktop
npm run tauri dev

# Production standalone executable build
npm run tauri build
```
Built binaries are produced in `apps/desktop/src-tauri/target/release/`.
