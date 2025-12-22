// Notifications and UI helper functions for popup
// Handles toast notifications, dialogs, and simple prompts

// ========================================
// Toast Notifications
// ========================================

export function showNotification(message: string, type: 'info' | 'success' | 'error', duration = 4000): void {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const container = document.getElementById('notification-container');
    if (!container) {
        console.warn('Notification container not found, message:', message);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

export function showError(message: string): void {
    showNotification(message, 'error', 5000);
}

export function showSuccess(message: string): void {
    showNotification(message, 'success', 3000);
}

export function showInfo(message: string): void {
    showNotification(message, 'info', 3000);
}

// ========================================
// Simple Prompts
// ========================================

export async function promptForAmount(message: string): Promise<number | null> {
    const input = prompt(message);
    if (!input) return null;
    
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount');
        return null;
    }
    
    return amount;
}

export async function promptForBolt11(): Promise<string | null> {
    const input = prompt('Enter Lightning invoice (bolt11):');
    if (!input) return null;
    
    if (!input.toLowerCase().startsWith('lnbc') && !input.toLowerCase().startsWith('lntb')) {
        showError('Please enter a valid Lightning invoice');
        return null;
    }
    
    return input;
}

// ========================================
// Dialog Components
// ========================================

export function showPinInputDialog(message: string): Promise<string | null> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px; width: 90%;';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #333;">${message}</h3>
            <input type="password" id="pin-dialog-input" placeholder="Enter PIN" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 16px; box-sizing: border-box;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="pin-dialog-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="pin-dialog-ok" style="padding: 8px 16px; border: none; background: #f7931a; color: white; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = document.getElementById('pin-dialog-input') as HTMLInputElement;
        const okBtn = document.getElementById('pin-dialog-ok');
        const cancelBtn = document.getElementById('pin-dialog-cancel');

        input.focus();

        const cleanup = (value: string | null) => {
            overlay.remove();
            resolve(value);
        };

        okBtn?.addEventListener('click', () => cleanup(input.value));
        cancelBtn?.addEventListener('click', () => cleanup(null));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') cleanup(input.value);
        });
    });
}

export function showConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 350px; width: 90%;';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 12px 0; color: #333;">${title}</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">${message}</p>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="confirm-dialog-no" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="confirm-dialog-yes" style="padding: 8px 16px; border: none; background: #f7931a; color: white; border-radius: 4px; cursor: pointer;">Confirm</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const yesBtn = dialog.querySelector('#confirm-dialog-yes') as HTMLButtonElement;
        const noBtn = dialog.querySelector('#confirm-dialog-no') as HTMLButtonElement;

        console.log('🔍 [Dialog] Buttons attached:', { yesBtn: !!yesBtn, noBtn: !!noBtn });

        let cleaned = false;
        const cleanup = (value: boolean) => {
            if (cleaned) {
                console.log('⚠️ [Dialog] Cleanup already called, skipping');
                return;
            }
            cleaned = true;
            console.log('🔵 [Dialog] Cleanup called with:', value);

            if (overlay.parentNode) {
                overlay.remove();
                console.log('✅ [Dialog] Overlay removed from DOM');
            } else {
                console.warn('⚠️ [Dialog] Overlay already removed');
            }

            document.querySelectorAll('.confirm-dialog-overlay').forEach(el => {
                console.log('🧹 [Dialog] Removing stale overlay');
                el.remove();
            });

            resolve(value);
        };

        if (yesBtn && noBtn) {
            yesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cleanup(true);
            });
            noBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cleanup(false);
            });
            console.log('✅ [Dialog] Event listeners attached successfully');
        } else {
            console.error('❌ [Dialog] Failed to attach event listeners - buttons not found');
            cleanup(false);
        }
    });
}

// ========================================
// Invoice QR Display
// ========================================

export function showInvoiceQR(invoice: string, amount: number): void {
    const qrDiv = document.createElement('div');
    qrDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; max-width: 400px;">
                <h3>Deposit ${amount.toLocaleString()} sats</h3>
                <div id="qr-code" style="margin: 20px 0;"></div>
                <p style="font-size: 12px; word-break: break-all; margin: 10px 0;">${invoice}</p>
                <button id="copy-invoice-btn" style="padding: 8px 16px; margin: 5px;">Copy Invoice</button>
                <button id="close-qr-btn" style="padding: 8px 16px; margin: 5px;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(qrDiv);

    const qrCodeDiv = document.getElementById('qr-code');
    if (qrCodeDiv) {
        qrCodeDiv.innerHTML = '<div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto;">QR Code Here</div>';
    }

    document.getElementById('copy-invoice-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(invoice);
        showSuccess('Invoice copied to clipboard!');
    });

    document.getElementById('close-qr-btn')?.addEventListener('click', () => {
        qrDiv.remove();
    });
}
