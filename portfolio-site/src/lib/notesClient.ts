export interface PublicNote {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly body: string;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly readingMinutes: number;
}

export type NoteStatus = 'draft' | 'published' | 'published_with_revision';

export interface AdminNote {
  readonly id: string;
  readonly status: NoteStatus;
  readonly isPublished: boolean;
  readonly hasUnpublishedChanges: boolean;
  readonly createdAt: string;
  readonly draft: {
    readonly title: string;
    readonly slug: string;
    readonly excerpt: string;
    readonly body: string;
    readonly updatedAt: string;
    readonly readingMinutes: number;
  };
  readonly published: {
    readonly title: string;
    readonly slug: string;
    readonly excerpt: string;
    readonly body: string;
    readonly publishedAt: string;
    readonly updatedAt: string;
    readonly readingMinutes: number;
  } | null;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function fetchPublishedNotes(): Promise<PublicNote[]> {
  const data = await requestJson<{ notes: PublicNote[] }>('/api/notes');
  return data.notes;
}

export async function fetchPublishedNoteBySlug(slug: string): Promise<PublicNote> {
  const data = await requestJson<{ note: PublicNote }>(
    `/api/notes/${encodeURIComponent(slug)}`,
  );
  return data.note;
}

export async function fetchAuthSession(): Promise<boolean> {
  const data = await requestJson<{ authenticated: boolean }>('/api/auth/session');
  return data.authenticated;
}

export async function loginStudio(password: string): Promise<boolean> {
  const data = await requestJson<{ authenticated: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return data.authenticated;
}

export async function logoutStudio(): Promise<void> {
  await requestJson<{ authenticated: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchAdminNotes(): Promise<AdminNote[]> {
  const data = await requestJson<{ notes: AdminNote[] }>('/api/admin/notes');
  return data.notes;
}

export async function createDraftNote(payload: {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
}): Promise<AdminNote> {
  const data = await requestJson<{ note: AdminNote }>('/api/admin/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.note;
}

export async function saveDraftNote(
  id: string,
  payload: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
  },
): Promise<AdminNote> {
  const data = await requestJson<{ note: AdminNote }>(
    `/api/admin/notes/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
  return data.note;
}

export async function publishNote(id: string): Promise<AdminNote> {
  const data = await requestJson<{ note: AdminNote }>(
    `/api/admin/notes/${encodeURIComponent(id)}/publish`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return data.note;
}

export async function unpublishNote(id: string): Promise<AdminNote> {
  const data = await requestJson<{ note: AdminNote }>(
    `/api/admin/notes/${encodeURIComponent(id)}/unpublish`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return data.note;
}

export async function discardRevision(id: string): Promise<AdminNote> {
  const data = await requestJson<{ note: AdminNote }>(
    `/api/admin/notes/${encodeURIComponent(id)}/discard`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return data.note;
}

export async function deleteNote(id: string): Promise<void> {
  await requestJson<{ deleted: boolean }>(
    `/api/admin/notes/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
}
