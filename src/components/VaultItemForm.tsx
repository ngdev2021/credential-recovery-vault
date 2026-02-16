import { useState, useEffect, useRef } from 'react';
import type { VaultItem, RecoveryCode, VaultItemCategory, VaultAttachment } from '../../shared/types/vault';
import { parseRecoveryCodesFromFile, rotateRecoveryCodes } from '../../shared/utils/recoveryCodes';

const CATEGORIES: VaultItemCategory[] = ['social', 'banking', 'work', 'dev', 'email', 'other'];

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
    maxWidth: 560,
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 600 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: 24,
    cursor: 'pointer',
  },
  row: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    minHeight: 80,
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  saveBtn: {
    padding: '10px 20px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  deleteBtn: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--danger)',
    borderRadius: 8,
    color: 'var(--danger)',
    fontSize: 14,
    marginRight: 'auto',
  },
  codesSection: { marginTop: 20 },
  codeRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  codeInput: {
    flex: 1,
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  addCodeBtn: {
    padding: '6px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    fontSize: 13,
  },
  uploadBtn: {
    padding: '6px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--accent)',
    fontSize: 13,
  },
  tagsInput: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
  },
};

const defaultItem: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  domain: '',
  category: 'other',
  usernames: [],
  password: '',
  recoveryCodes: [],
  notes: '',
  tags: [],
};

interface VaultItemFormProps {
  mode: 'add' | 'edit';
  item?: VaultItem;
  onSave: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onAttachmentsChange?: () => void;
}

export function VaultItemForm({
  mode,
  item,
  onSave,
  onCancel,
  onDelete,
  onAttachmentsChange,
}: VaultItemFormProps) {
  const [form, setForm] = useState<Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'> & { attachments?: VaultAttachment[] }>(defaultItem);
  const [usernamesStr, setUsernamesStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [importPreview, setImportPreview] = useState<{ filename: string; count: number; duplicates: number } | null>(null);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        domain: item.domain,
        category: item.category,
        usernames: item.usernames ?? [],
        password: item.password,
        recoveryCodes: item.recoveryCodes ?? [],
        notes: item.notes ?? '',
        tags: item.tags ?? [],
        attachments: item.attachments ?? [],
      });
      setUsernamesStr(item.usernames?.join(', ') ?? '');
      setTagsStr(item.tags?.join(', ') ?? '');
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const usernames = usernamesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const tags = tagsStr.split(',').map((s) => s.trim()).filter(Boolean);
    const attachments = form.attachments ?? item?.attachments ?? [];
    const payload = { ...form, usernames, tags, attachments };
    onSave(payload);
  };

  const addRecoveryCode = () => {
    const newCode: RecoveryCode = {
      id: crypto.randomUUID(),
      code: '',
      status: 'unused',
      createdAt: new Date().toISOString(),
      source: 'imported',
    };
    setForm((f) => ({
      ...f,
      recoveryCodes: [...(f.recoveryCodes ?? []), newCode],
    }));
  };

  const updateRecoveryCode = (id: string, code: string) => {
    setForm((f) => ({
      ...f,
      recoveryCodes: (f.recoveryCodes ?? []).map((c) =>
        c.id === id ? { ...c, code } : c
      ),
    }));
  };

  const removeRecoveryCode = (id: string) => {
    setForm((f) => ({
      ...f,
      recoveryCodes: (f.recoveryCodes ?? []).filter((c) => c.id !== id),
    }));
  };

  const toggleRecoveryCodeUsed = (id: string) => {
    setForm((f) => ({
      ...f,
      recoveryCodes: (f.recoveryCodes ?? []).map((c) =>
        c.id === id
          ? {
              ...c,
              status: c.status === 'used' ? ('unused' as const) : ('used' as const),
            }
          : c
      ),
    }));
  };

  const handleRotateRecoveryCodes = () => {
    const now = new Date().toISOString();
    setForm((f) => ({
      ...f,
      recoveryCodes: rotateRecoveryCodes(f.recoveryCodes ?? [], now),
    }));
  };

  const addCodesToForm = (codes: string[]) => {
    setForm((f) => {
      const existing = new Set((f.recoveryCodes ?? []).map((c) => c.code));
      const newCodes: RecoveryCode[] = [];

      for (const code of codes) {
        if (!existing.has(code)) {
          existing.add(code);
          newCodes.push({
            id: crypto.randomUUID(),
            code,
            status: 'unused' as const,
            createdAt: new Date().toISOString(),
            source: 'imported' as const,
          });
        }
      }

      return {
        ...f,
        recoveryCodes: [...(f.recoveryCodes ?? []), ...newCodes],
      };
    });
  };

  const handleUploadAndImport = async () => {
    const filePath = await window.vault.pickFile({ forImport: true });
    if (!filePath) return;
    try {
      const { text, filename } = await window.vault.readAndParseRecoveryFile(filePath);
      const { codes, duplicateCount } = parseRecoveryCodesFromFile(text);
      addCodesToForm(codes);
      setImportPreview({ filename, count: codes.length, duplicates: duplicateCount });
      setTimeout(() => setImportPreview(null), 5000);
    } catch (err) {
      console.error('Import failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to import');
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { codes } = parseRecoveryCodesFromFile(text);
      addCodesToForm(codes);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAttachFile = async () => {
    if (!item?.id) return;
    try {
      const attachment = (await window.vault.attachFile(item.id)) as VaultAttachment | null;
      if (attachment) {
        setForm((f) => {
          const exists = (f.attachments ?? []).some((a) => a.sha256 === attachment.sha256);
          if (exists) return f;
          return { ...f, attachments: [...(f.attachments ?? []), attachment] };
        });
        onAttachmentsChange?.();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to attach file');
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!item?.id) return;
    if (!confirm('Remove this attachment? The file will be permanently deleted.')) return;
    try {
      await window.vault.removeAttachment(item.id, attachmentId);
      setForm((f) => ({ ...f, attachments: (f.attachments ?? []).filter((a) => a.id !== attachmentId) }));
      onAttachmentsChange?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const handleOpenAttachment = async (attachmentId: string) => {
    try {
      await window.vault.openAttachment(attachmentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open');
    }
  };


  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{mode === 'add' ? 'Add credential' : 'Edit credential'}</h2>
          <button style={styles.closeBtn} onClick={onCancel} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <label style={styles.label}>Title / Service name</label>
            <input
              style={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. GitHub, AWS"
              required
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Domain / URL</label>
            <input
              style={styles.input}
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="e.g. github.com"
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Category</label>
            <select
              style={styles.select}
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as VaultItemCategory }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Usernames / emails (comma-separated)</label>
            <input
              style={styles.input}
              value={usernamesStr}
              onChange={(e) => setUsernamesStr(e.target.value)}
              placeholder="user@example.com, username"
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Password</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                style={styles.input}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Optional if using password manager"
              />
              {form.password && (
                <button
                  type="button"
                  style={styles.addCodeBtn}
                  onClick={() => window.vault.copyWithTimeout(form.password)}
                  title="Copy (clears in 30s)"
                >
                  Copy
                </button>
              )}
            </div>
          </div>

          <div style={styles.codesSection}>
            <label style={styles.label}>Recovery codes</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              style={{ display: 'none' }}
              onChange={handleUploadFile}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" style={styles.addCodeBtn} onClick={addRecoveryCode}>
                + Add recovery code
              </button>
              <button
                type="button"
                style={styles.uploadBtn}
                onClick={handleUploadAndImport}
                title="Upload a .txt or .csv file and import codes"
              >
                Upload & Import Codes
              </button>
              <button
                type="button"
                style={styles.addCodeBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Alternative file picker"
              >
                Import from file…
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={showUnusedOnly}
                  onChange={(e) => setShowUnusedOnly(e.target.checked)}
                />
                Show unused only
              </label>
              {(form.recoveryCodes ?? []).some((c) => c.status === 'unused' || c.status === 'used') && (
                <button type="button" style={styles.addCodeBtn} onClick={handleRotateRecoveryCodes} title="Archive current set and add new codes">
                  Rotate set
                </button>
              )}
            </div>
            {importPreview && (
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                Imported {importPreview.count} codes from {importPreview.filename}
                {importPreview.duplicates > 0 && ` · ${importPreview.duplicates} duplicates skipped`}
                {form.recoveryCodes && importPreview.count > 0 && (
                  <div style={{ marginTop: 6 }}>
                    Preview: {form.recoveryCodes.slice(-importPreview.count).slice(0, 5).map((c) => c.code.replace(/./g, '•').slice(0, 8)).join(', ')}
                    {importPreview.count > 5 && '…'}
                  </div>
                )}
              </div>
            )}
            {(form.recoveryCodes ?? [])
              .filter((c) => !showUnusedOnly || c.status === 'unused')
              .map((c) => (
                <div key={c.id} style={{ ...styles.codeRow, opacity: c.status === 'replaced' || c.status === 'invalid' ? 0.6 : 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 70, fontSize: 12, color: 'var(--text-secondary)' }} title={c.status}>
                    <input
                      type="checkbox"
                      checked={c.status === 'used'}
                      onChange={() => toggleRecoveryCodeUsed(c.id)}
                      title={c.status === 'used' ? 'Mark as unused' : 'Mark as used'}
                    />
                    {c.status === 'used' ? 'Used' : c.status === 'replaced' ? 'Replaced' : 'Unused'}
                  </label>
                  <input
                    type="password"
                    style={styles.codeInput}
                    value={c.code}
                    onChange={(e) => updateRecoveryCode(c.id, e.target.value)}
                    placeholder="Code"
                  />
                  {c.code && (
                    <button
                      type="button"
                      style={styles.addCodeBtn}
                      onClick={() => window.vault.copyWithTimeout(c.code)}
                      title="Copy (clears in 30s)"
                    >
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.addCodeBtn}
                    onClick={() => removeRecoveryCode(c.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>

          {mode === 'edit' && item && (
            <div style={{ ...styles.codesSection, marginTop: 20 }}>
              <label style={styles.label}>Attachments (encrypted)</label>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Store the original PDF/TXT—never lose the exact file the site gave you.
              </p>
              <button type="button" style={styles.uploadBtn} onClick={handleAttachFile}>
                Attach File (Encrypted)
              </button>
              {(form.attachments ?? []).length > 0 && (
                <ul style={{ marginTop: 12, padding: 0, listStyle: 'none' }}>
                  {(form.attachments ?? []).map((a) => (
                    <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{a.filename}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(a.size / 1024).toFixed(1)} KB</span>
                      <button type="button" style={styles.addCodeBtn} onClick={() => handleOpenAttachment(a.id)}>
                        Open
                      </button>
                      <button type="button" style={styles.addCodeBtn} onClick={() => handleRemoveAttachment(a.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ ...styles.row, marginTop: 16 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Security questions, hints, etc."
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>Tags (comma-separated)</label>
            <input
              style={styles.tagsInput}
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="work, important, 2fa"
            />
          </div>

          <div style={styles.actions}>
            {mode === 'edit' && onDelete && (
              <button type="button" style={styles.deleteBtn} onClick={onDelete}>
                Delete
              </button>
            )}
            <button type="button" style={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn}>
              {mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
