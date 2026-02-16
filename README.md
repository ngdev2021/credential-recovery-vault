# Credential & Recovery Vault

A zero-knowledge desktop app for storing credentials, recovery codes, and notes. Everything is encrypted locally with your master password—nothing leaves your machine in plaintext.

## Security Model

- **Argon2id** for key derivation (64 MB memory, 3 iterations)
- **XChaCha20-Poly1305** for authenticated encryption
- Encrypted vault stored at `~/.config/credential-recovery-vault/vault.enc.json` (or equivalent `userData` path)
- Master password never sent over network; crypto runs in Electron main process

## Getting Started

```bash
npm install
npm run electron:dev
```

This starts Vite and Electron. Create a vault with a strong master password (min 12 chars), then add credentials, recovery codes, and notes.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run electron:dev` | Start app in development |
| `npm run build` | Build web assets and Electron main |
| `npm run electron:build` | Build distributable app |

## Phase 1 Features

- [x] Create vault (master password)
- [x] Unlock / lock vault
- [x] Add, edit, delete vault items
- [x] Search by title, domain, tags, username
- [x] Recovery codes (add, store per item)
- [ ] Encrypted export/import (API ready, UI pending)
- [ ] Emergency recovery kit (Phase 2)

## Project Structure

```
├── electron/          # Main process
│   ├── main.ts        # App entry, IPC handlers
│   ├── preload.ts     # Exposes vault API to renderer
│   ├── vaultStore.ts  # Vault file I/O
│   └── crypto/        # Key derivation, encryption
├── src/               # React frontend
│   ├── pages/         # CreateVault, UnlockVault, VaultDashboard
│   ├── components/    # VaultItemList, VaultItemForm
│   └── types/         # VaultItem, RecoveryCode, etc.
└── index.html
```

## License

MIT
