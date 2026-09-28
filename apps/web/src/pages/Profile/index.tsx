import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { fetchBackground, fetchCertifications, fetchFieldMatches } from '../../features/dashboard/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

const VIEW_PX = 240;
const OUT_PX = 256;

interface EditorImage {
  img: HTMLImageElement;
  url: string;
  w: number;
  h: number;
}

function loadImage(file: File): Promise<EditorImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width < 2 || img.height < 2) {
        URL.revokeObjectURL(url);
        reject(new Error('image is too small'));
        return;
      }
      resolve({ img, url, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read that file as an image'));
    };
    img.src = url;
  });
}

function Avatar({ url, name, size = 112 }: { url: string | null; name: string; size?: number }): JSX.Element {
  if (url) return <img className="profile-avatar" style={{ width: size, height: size }} src={url} alt={`${name}'s profile photo`} />;
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <span className="profile-avatar profile-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {initial}
    </span>
  );
}

interface Summary {
  picks: number;
  top: string | null;
  certs: number;
  events: number;
}

export default function Profile(): JSX.Element {
  const { account, userEmail, displayName, avatarUrl, clubName, saveProfile } = useAuth();
  const [name, setName] = useState(displayName ?? '');
  const [editor, setEditor] = useState<EditorImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(account === 'person');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

  useEffect(() => {
    if (account !== 'person') return;
    let cancelled = false;
    (async () => {
      try {
        const [bg, matches, certs, mine] = await Promise.all([
          fetchBackground(),
          fetchFieldMatches().catch(() => null),
          fetchCertifications().catch(() => ({ earned: [], inProgress: [] })),
          api<{ events: unknown[] }>('/users/me/events', { account: 'person' }).then((d) => d.events).catch(() => []),
        ]);
        if (!cancelled) {
          setSummary({
            picks: bg.length,
            top: matches?.[0]?.name ?? null,
            certs: certs.earned.length,
            events: mine.length,
          });
        }
      } catch (e) {
        if (!cancelled) setError(apiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  // Revoke the editor object URL when replaced or unmounted.
  useEffect(() => {
    const url = editor?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [editor?.url]);

  if (account === null) {
    return (
      <div className="container">
        <div className="page-head"><h1>Profile</h1><p>Your photo, name, and journey in one place.</p></div>
        <div style={{ margin: '16px 0 64px' }}>
          <EmptyState title="Sign in to see your profile" body="Put a photo, manage your display name, and review your progress." actionLabel="Sign in" actionTo="/login" />
        </div>
      </div>
    );
  }

  if (account === 'organisation') {
    return (
      <div className="container">
        <div className="page-head"><h1>{clubName ?? 'Club'}</h1><p>Organisation accounts manage events, not student profiles.</p></div>
        <Card>
          <p style={{ fontSize: '0.875rem' }}>Your club tools — post, publish, and track events — live in the Org section.</p>
          <Link className="btn btn-primary" to="/org">Go to Org dashboard</Link>
        </Card>
      </div>
    );
  }

  const shownName = displayName || (userEmail ?? '').split('@')[0] || 'Student';

  // Cover-fit geometry: base scale fills the square viewport; zoom magnifies;
  // offset recenters. Offsets clamp so the image always covers the viewport.
  const base = editor ? Math.max(VIEW_PX / editor.w, VIEW_PX / editor.h) : 1;
  const eff = base * zoom;
  const dispW = editor ? editor.w * eff : 0;
  const dispH = editor ? editor.h * eff : 0;
  const maxX = Math.max(0, (dispW - VIEW_PX) / 2);
  const maxY = Math.max(0, (dispH - VIEW_PX) / 2);
  const cx = Math.max(-maxX, Math.min(maxX, offset.x));
  const cy = Math.max(-maxY, Math.min(maxY, offset.y));

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    (e.target as HTMLDivElement).setPointerCapture?.(e.pointerId);
    setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    if (!drag) return;
    setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y });
  }

  function endDrag(): void {
    setDrag(null);
  }

  function renderCrop(): string {
    if (!editor) throw new Error('no image');
    // Viewport pixel (vx,vy) maps to image (W/2 + (vx−V/2−ox)/eff, …).
    // Crop the exact visible square, clamped into the image for float safety.
    const size = VIEW_PX / eff;
    const sx = Math.max(0, Math.min(editor.w - size, editor.w / 2 - (VIEW_PX / 2 + cx) / eff));
    const sy = Math.max(0, Math.min(editor.h - size, editor.h / 2 - (VIEW_PX / 2 + cy) / eff));
    const canvas = document.createElement('canvas');
    canvas.width = OUT_PX;
    canvas.height = OUT_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(editor.img, sx, sy, size, size, 0, 0, OUT_PX, OUT_PX);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!file.type.startsWith('image/')) {
      setError('Pick an image file (PNG, JPEG, or WebP).');
      return;
    }
    try {
      if (editor) URL.revokeObjectURL(editor.url);
      setEditor(await loadImage(file));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setNotice('Adjust position and zoom, then save.');
    } catch {
      setError('Could not read that file as an image.');
    }
  }

  function cancelEditor(): void {
    if (editor) URL.revokeObjectURL(editor.url);
    setEditor(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function savePhoto(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ avatarUrl: renderCrop() });
      cancelEditor();
      setNotice('Profile photo updated.');
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ avatarUrl: null });
      setNotice('Profile photo removed.');
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveName(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Display name cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ displayName: trimmed });
      setNotice('Display name updated.');
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="profile-cover" aria-hidden="true" />
      <div className="profile-head">
        <Avatar url={editor ? editor.url : avatarUrl} name={shownName} />
        <div>
          <h1 style={{ margin: 0 }}>{shownName}</h1>
          <p className="profile-email">{userEmail}</p>
        </div>
      </div>

      {error ? <div style={{ marginTop: 12 }}><ErrorState title="Something went wrong" body={error} /></div> : null}
      {notice ? <p style={{ marginTop: 12 }}><Badge tone="teal">{notice}</Badge></p> : null}

      <div className="grid-2">
        <Card>
          <h2>Profile photo</h2>
          {!editor ? (
            <>
              <p style={{ fontSize: '0.875rem' }}>Square-ish works best. You will adjust position and zoom before saving — the image is resized in your browser, never uploaded full-size.</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void onPick(e)} hidden />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {avatarUrl ? 'Change photo…' : 'Upload photo…'}
                </Button>
                {avatarUrl ? <Button variant="ghost" onClick={() => void removePhoto()} disabled={busy}>Remove</Button> : null}
              </div>
            </>
          ) : (
            <>
              <div
                className="avatar-editor"
                role="application"
                aria-label="Adjust your photo: drag to reposition"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <img
                  src={editor.url}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    width: dispW,
                    height: dispH,
                    transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
                  }}
                />
              </div>
              <label className="field-label" htmlFor="avatar-zoom" style={{ display: 'block', marginTop: 12 }}>
                Zoom {Math.round(zoom * 100)}%
              </label>
              <input
                id="avatar-zoom"
                type="range"
                className="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <p style={{ fontSize: '0.875rem' }}>Drag the photo to reposition · slide to zoom. The circle shows the final avatar.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Avatar url={editor.url} name={shownName} size={64} />
                <Button variant="primary" onClick={() => void savePhoto()} disabled={busy}>Save photo</Button>
                <Button variant="ghost" onClick={cancelEditor} disabled={busy}>Cancel</Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2>Display name</h2>
          <Field label="Shown in greetings, header, and leaderboard" name="displayName" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <Button variant="primary" onClick={() => void saveName()} disabled={busy || name.trim() === (displayName ?? '')}>
            Save name
          </Button>
        </Card>
      </div>

      <Card>
        <h2>Your journey</h2>
        {loading ? (
          <LoadingSkeleton lines={3} />
        ) : summary ? (
          <div className="kpi-grid">
            <div className="kpi"><div className="kpi-value">{summary.picks}</div><div className="kpi-label">background picks</div></div>
            <div className="kpi"><div className="kpi-value">{summary.top ?? '—'}</div><div className="kpi-label">top field match</div></div>
            <div className="kpi"><div className="kpi-value">{summary.certs}</div><div className="kpi-label">certifications</div></div>
            <div className="kpi"><div className="kpi-value">{summary.events}</div><div className="kpi-label">events joined</div></div>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/dashboard">Dashboard</Link>
          <Link className="btn btn-secondary" to="/roadmap">Roadmap</Link>
          <Link className="btn btn-secondary" to="/networking">Networking</Link>
        </div>
      </Card>
    </div>
  );
}
