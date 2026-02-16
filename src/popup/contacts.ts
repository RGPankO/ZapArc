// Contacts / Address Book UI

import { ChromeStorageManager } from '../utils/storage';
import type { Contact } from '../types';
import { showError, showSuccess, showConfirmDialog } from './notifications';
import { showModal, hideModal } from './modals';

const storage = new ChromeStorageManager();
const LIGHTNING_ADDRESS_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;

let cachedContacts: Contact[] = [];
let currentEditId: string | null = null;
let pickerCallback: ((contact: Contact) => void) | null = null;

function getMyLightningAddress(): string | null {
  const el = document.getElementById('lightning-address-value');
  return el?.textContent?.trim() || null;
}

export function initializeContactsUI(): void {
  const backBtn = document.getElementById('contacts-back-btn');
  if (backBtn && !backBtn.onclick) {
    backBtn.onclick = () => hideContactsInterface();
  }

  const addBtn = document.getElementById('contacts-add-btn');
  if (addBtn && !addBtn.onclick) {
    addBtn.onclick = () => openContactModal();
  }

  const searchInput = document.getElementById('contacts-search-input') as HTMLInputElement | null;
  if (searchInput && !searchInput.oninput) {
    searchInput.oninput = () => renderContactsList();
  }

  const saveBtn = document.getElementById('contact-modal-save');
  if (saveBtn && !saveBtn.onclick) {
    saveBtn.onclick = () => handleSaveContact();
  }

  const cancelBtn = document.getElementById('contact-modal-cancel');
  if (cancelBtn && !cancelBtn.onclick) {
    cancelBtn.onclick = () => hideModal('contact-modal');
  }

  const pickerCancel = document.getElementById('contact-picker-cancel');
  if (pickerCancel && !pickerCancel.onclick) {
    pickerCancel.onclick = () => closePicker();
  }

  const pickerSearch = document.getElementById('contact-picker-search') as HTMLInputElement | null;
  if (pickerSearch && !pickerSearch.oninput) {
    pickerSearch.oninput = () => renderContactPickerList();
  }
}

export async function showContactsInterface(): Promise<void> {
  const mainInterface = document.getElementById('main-interface');
  if (mainInterface) mainInterface.classList.add('hidden');

  const contactsInterface = document.getElementById('contacts-interface');
  if (contactsInterface) contactsInterface.classList.remove('hidden');

  await loadContacts();
  renderContactsList();
}

export function hideContactsInterface(): void {
  const contactsInterface = document.getElementById('contacts-interface');
  if (contactsInterface) contactsInterface.classList.add('hidden');

  const mainInterface = document.getElementById('main-interface');
  if (mainInterface) mainInterface.classList.remove('hidden');
}

export async function openContactPicker(onSelect: (contact: Contact) => void): Promise<void> {
  pickerCallback = onSelect;
  await loadContacts();
  renderContactPickerList();
  showModal('contact-picker-modal');
}

async function loadContacts(): Promise<void> {
  cachedContacts = await storage.getContacts();
  cachedContacts.sort((a, b) => a.name.localeCompare(b.name));
}

function renderContactsList(): void {
  const list = document.getElementById('contacts-list');
  const emptyState = document.getElementById('contacts-empty');
  const searchInput = document.getElementById('contacts-search-input') as HTMLInputElement | null;

  if (!list) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const filtered = cachedContacts.filter(contact => matchesQuery(contact, query));

  list.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.textContent = query ? 'No contacts match your search' : 'No contacts yet';
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  filtered.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.dataset.id = contact.id;

    const info = document.createElement('div');
    info.className = 'contact-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'contact-name-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'contact-name';
    nameEl.textContent = contact.name;

    nameRow.appendChild(nameEl);

    const myAddress = getMyLightningAddress();
    if (myAddress && contact.lightningAddress.toLowerCase() === myAddress.toLowerCase()) {
      const badge = document.createElement('span');
      badge.className = 'contact-self-badge';
      badge.textContent = 'You';
      nameRow.appendChild(badge);
    }

    const addressEl = document.createElement('div');
    addressEl.className = 'contact-address';
    addressEl.textContent = contact.lightningAddress;

    info.appendChild(nameRow);
    info.appendChild(addressEl);

    const actions = document.createElement('div');
    actions.className = 'contact-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'contact-action-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit contact';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openContactModal(contact);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'contact-action-btn danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete contact';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleDeleteContact(contact);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);

    item.addEventListener('click', () => {
      copyToClipboard(contact.lightningAddress);
    });

    list.appendChild(item);
  });
}

function renderContactPickerList(): void {
  const list = document.getElementById('contact-picker-list');
  const emptyState = document.getElementById('contact-picker-empty');
  const searchInput = document.getElementById('contact-picker-search') as HTMLInputElement | null;

  if (!list) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const filtered = cachedContacts.filter(contact => matchesQuery(contact, query));

  list.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.textContent = query ? 'No contacts match your search' : 'No contacts available';
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  filtered.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.dataset.id = contact.id;

    const info = document.createElement('div');
    info.className = 'contact-info';

    const nameRow2 = document.createElement('div');
    nameRow2.className = 'contact-name-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'contact-name';
    nameEl.textContent = contact.name;

    nameRow2.appendChild(nameEl);

    const myAddr = getMyLightningAddress();
    if (myAddr && contact.lightningAddress.toLowerCase() === myAddr.toLowerCase()) {
      const badge = document.createElement('span');
      badge.className = 'contact-self-badge';
      badge.textContent = 'You';
      nameRow2.appendChild(badge);
    }

    const addressEl = document.createElement('div');
    addressEl.className = 'contact-address';
    addressEl.textContent = contact.lightningAddress;

    info.appendChild(nameRow2);
    info.appendChild(addressEl);

    item.appendChild(info);
    item.addEventListener('click', () => {
      if (pickerCallback) {
        pickerCallback(contact);
      }
      closePicker();
    });

    list.appendChild(item);
  });
}

function openContactModal(contact?: Contact): void {
  currentEditId = contact?.id || null;

  const title = document.getElementById('contact-modal-title');
  const nameInput = document.getElementById('contact-name-input') as HTMLInputElement | null;
  const addressInput = document.getElementById('contact-lightning-input') as HTMLInputElement | null;
  const notesInput = document.getElementById('contact-notes-input') as HTMLTextAreaElement | null;
  const errorEl = document.getElementById('contact-modal-error');

  if (title) title.textContent = contact ? 'Edit Contact' : 'Add Contact';
  if (nameInput) nameInput.value = contact?.name || '';
  if (addressInput) addressInput.value = contact?.lightningAddress || '';
  if (notesInput) notesInput.value = contact?.notes || '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  showModal('contact-modal');
}

async function handleSaveContact(): Promise<void> {
  const nameInput = document.getElementById('contact-name-input') as HTMLInputElement | null;
  const addressInput = document.getElementById('contact-lightning-input') as HTMLInputElement | null;
  const notesInput = document.getElementById('contact-notes-input') as HTMLTextAreaElement | null;
  const errorEl = document.getElementById('contact-modal-error');

  if (!nameInput || !addressInput) return;

  const name = nameInput.value.trim();
  const lightningAddress = addressInput.value.trim();
  const notes = notesInput?.value.trim() || '';

  const validation = validateContact(name, lightningAddress, notes);
  if (!validation.isValid) {
    if (errorEl) {
      errorEl.textContent = validation.error || 'Invalid contact';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  const now = Date.now();
  try {
    if (currentEditId) {
      await storage.updateContact(currentEditId, {
        name,
        lightningAddress,
        notes: notes || undefined,
        updatedAt: now
      });
      showSuccess('Contact updated');
    } else {
      const contact: Contact = {
        id: crypto.randomUUID(),
        name,
        lightningAddress,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now
      };
      await storage.addContact(contact);
      showSuccess('Contact added');
    }

    await loadContacts();
    renderContactsList();
    hideModal('contact-modal');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save contact';
    showError(message);
  }
}

async function handleDeleteContact(contact: Contact): Promise<void> {
  const confirmed = await showConfirmDialog('Delete Contact', `Delete ${contact.name}?`);
  if (!confirmed) return;

  try {
    await storage.deleteContact(contact.id);
    await loadContacts();
    renderContactsList();
    showSuccess('Contact deleted');
  } catch (error) {
    showError('Failed to delete contact');
  }
}

function closePicker(): void {
  pickerCallback = null;
  hideModal('contact-picker-modal');
}

function matchesQuery(contact: Contact, query: string): boolean {
  if (!query) return true;
  return contact.name.toLowerCase().includes(query)
    || contact.lightningAddress.toLowerCase().includes(query)
    || (contact.notes || '').toLowerCase().includes(query);
}

function validateContact(name: string, lightningAddress: string, notes: string): { isValid: boolean; error?: string } {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { isValid: false, error: `Name must be ${MAX_NAME_LENGTH} characters or less` };
  }
  if (!lightningAddress) {
    return { isValid: false, error: 'Lightning address is required' };
  }
  if (!LIGHTNING_ADDRESS_REGEX.test(lightningAddress)) {
    return { isValid: false, error: 'Lightning address must be in user@domain.tld format' };
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    return { isValid: false, error: `Notes must be ${MAX_NOTES_LENGTH} characters or less` };
  }
  return { isValid: true };
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard!');
  } catch (error) {
    console.error('[Contacts] Failed to copy:', error);
    showError('Failed to copy');
  }
}
