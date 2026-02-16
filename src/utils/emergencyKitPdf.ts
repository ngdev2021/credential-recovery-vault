import { jsPDF } from 'jspdf';
import type { VaultMetadata } from '../../shared/types/vault';

export interface EmergencyKitData {
  vaultId: string;
  itemCount: number;
  lastBackupTime: string | null;
}

/**
 * Generate a safe PDF containing only vault metadata for emergency recovery.
 * Does NOT include: secrets, codes, passwords, attachments, domains.
 */
export function generateEmergencyKitPdf(data: EmergencyKitData): void {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;
  const lineHeight = 8;

  doc.setFontSize(18);
  doc.text('Emergency Recovery Kit', margin, y);
  y += lineHeight * 2;

  doc.setFontSize(11);
  doc.text('Store this page securely. Do not store with your master password.', margin, y);
  y += lineHeight * 2;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Vault ID:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.vaultId, margin + 40, y);
  y += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Item count:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.itemCount), margin + 40, y);
  y += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Last backup:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.lastBackupTime ?? 'Never', margin + 40, y);
  y += lineHeight * 2;

  doc.setFontSize(10);
  doc.text(
    'Instructions:',
    margin,
    y
  );
  y += lineHeight;
  doc.text(
    '• Your master password is the only way to unlock this vault. Store it separately in a secure location.',
    margin,
    y,
    { maxWidth: 170 }
  );
  y += lineHeight * 2;
  doc.text(
    '• To restore your vault: open the Credential & Recovery Vault app, go to Import, and select your backup file.',
    margin,
    y,
    { maxWidth: 170 }
  );
  y += lineHeight * 2;
  doc.text(
    '• This PDF contains no secrets, passwords, recovery codes, or attachment data.',
    margin,
    y,
    { maxWidth: 170 }
  );

  doc.save('emergency-recovery-kit.pdf');
}
