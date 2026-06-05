'use client';

/**
 * Passport section 9 — "Контакты".
 *
 * Data is a flat list `passport.contacts` (ContactItem[]). View mode shows a
 * card grid; edit mode uses the shared EditableTable. Save replaces the whole
 * list via `savePassportSection('contacts', rows)`.
 */

import React, { useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type { ContactItem } from '../types';
import { newId } from '../types';
import {
  Card, EditableTable, EditableColumn, EditToggle, EmptyState, PhoneIcon,
} from '../primitives';

export default function ContactsSection({ ctx }: { ctx: PassportCtx }) {
  const contacts: ContactItem[] = ctx.passport.contacts || [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ContactItem[]>(contacts);

  const start = () => { setDraft(contacts); setEditing(true); };
  const cancel = () => { setDraft(contacts); setEditing(false); };
  const save = async () => {
    setSaving(true);
    try {
      await ctx.savePassportSection('contacts', draft);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<ContactItem>[] = [
    { key: 'role', label: 'Роль', placeholder: 'Прораб' },
    { key: 'name', label: 'ФИО' },
    { key: 'org', label: 'Организация' },
    { key: 'phone', label: 'Телефон' },
    { key: 'email', label: 'Email' },
    { key: 'note', label: 'Примечание' },
  ];

  return (
    <div className="space-y-5">
      <Card
        title={`Контакты · ${contacts.length}`}
        actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
      >
        {editing ? (
          <EditableTable
            rows={draft}
            columns={columns}
            onChange={setDraft}
            makeEmpty={() => ({ id: newId() })}
            addLabel="Добавить контакт"
          />
        ) : contacts.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {contacts.map((c) => (
              <ContactCardItem key={c.id} contact={c} />
            ))}
          </div>
        ) : (
          <EmptyState text="Контакты не добавлены" />
        )}
      </Card>
    </div>
  );
}

function ContactCardItem({ contact }: { contact: ContactItem }) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{contact.name || '—'}</p>
          {contact.role && <p className="text-xs text-violet-600 dark:text-violet-400">{contact.role}</p>}
        </div>
      </div>
      <dl className="mt-2 space-y-1">
        {contact.org && <dd className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.org}</dd>}
        {contact.phone && (
          <dd className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
            <PhoneIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <a href={`tel:${contact.phone}`} className="hover:text-violet-600 dark:hover:text-violet-400 truncate">{contact.phone}</a>
          </dd>
        )}
        {contact.email && (
          <dd className="text-sm text-gray-700 dark:text-gray-200 truncate">
            <a href={`mailto:${contact.email}`} className="hover:text-violet-600 dark:hover:text-violet-400">{contact.email}</a>
          </dd>
        )}
        {contact.note && <dd className="text-xs text-gray-400 break-words">{contact.note}</dd>}
      </dl>
    </div>
  );
}
