import { useEffect, useMemo, useRef } from 'react';
import type { PathNode } from '../../features/roadmap/api';
import { stateGlyph } from './NodeDrawer';

function shape(n: PathNode): string {
  if (n.kind === 'quiz') return '◆';
  if (n.kind === 'project') return '⬡';
  if (n.kind === 'cert') return '🎖';
  return '●';
}

function nodeLabel(n: PathNode): string {
  const base =
    n.kind === 'course' ? (n.concept?.name ?? n.key)
    : n.kind === 'quiz' ? `Quiz ${n.position}` + (n.questionCount ? ` (${n.questionCount}Q)` : '')
    : n.kind === 'project' ? (n.taster?.title ?? n.key)
    : (n.cert?.title ?? n.key);
  return `${base} — ${n.state.replace('_', ' ')}${n.kind === 'project' ? ', locking gate' : ''}${n.kind === 'cert' ? ', optional bonus' : ''}`;
}

/** Vertical skill-tree: linear spine, alternating stations, cert side-badges. */
export default function RoadmapPath({
  nodes,
  currentKey,
  unlockedKeys,
  selectedKey,
  onSelect,
}: {
  nodes: PathNode[];
  currentKey: string | null;
  unlockedKeys: Set<string>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}): JSX.Element {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const scrolled = useRef(false);

  const main = useMemo(() => nodes.filter((n) => n.kind !== 'cert'), [nodes]);
  const certsByPosition = useMemo(() => {
    const m = new Map<number, PathNode[]>();
    for (const n of nodes) {
      if (n.kind !== 'cert') continue;
      const arr = m.get(n.position) ?? [];
      arr.push(n);
      m.set(n.position, arr);
    }
    return m;
  }, [nodes]);

  useEffect(() => {
    scrolled.current = false;
  }, [nodes]);

  useEffect(() => {
    if (scrolled.current || !currentKey) return;
    const el = refs.current.get(currentKey);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      scrolled.current = true;
    }
  }, [currentKey, nodes]);

  function onKeyDown(e: React.KeyboardEvent, idx: number): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next = idx + (e.key === 'ArrowDown' ? 1 : -1);
    const target = main[next];
    if (target) refs.current.get(target.key)?.focus();
  }

  return (
    <div className="path-tree" role="list" aria-label="Learning path">
      {main.map((n, idx) => {
        const certs = certsByPosition.get(n.position) ?? [];
        const justUnlocked = unlockedKeys.has(n.key);
        const interactive = n.state !== 'locked';
        return (
          <div className={`path-station side-${idx % 2 === 0 ? 'left' : 'right'}`} key={n.key} role="listitem">
            <div className="path-spine" aria-hidden="true" />
            <button
              ref={(el) => {
                if (el) refs.current.set(n.key, el);
                else refs.current.delete(n.key);
              }}
              type="button"
              className={`path-node kind-${n.kind} state-${n.state}${justUnlocked ? ' just-unlocked' : ''}${selectedKey === n.key ? ' selected' : ''}`}
              disabled={!interactive}
              aria-label={nodeLabel(n)}
              aria-disabled={!interactive}
              onClick={() => onSelect(n.key)}
              onKeyDown={(e) => onKeyDown(e, idx)}
            >
              <span className="path-shape" aria-hidden="true">{shape(n)}</span>
              <span className="path-glyph" aria-hidden="true">{stateGlyph(n.state)}</span>
            </button>
            <div className="path-caption">
              <strong>{n.kind === 'course' ? n.concept?.name : n.kind === 'quiz' ? `Quiz ${n.position}` : n.taster?.title}</strong>
              <span className="path-sub">
                {n.kind === 'quiz' ? 'gate · answer to pass' : n.kind === 'project' ? 'gate · build to pass' : n.concept?.level ?? ''}
              </span>
            </div>
            {certs.length > 0 ? (
              <div className="path-certs">
                {certs.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`path-cert state-${c.state}${unlockedKeys.has(c.key) ? ' just-unlocked' : ''}`}
                    aria-label={nodeLabel(c)}
                    onClick={() => onSelect(c.key)}
                  >
                    🎖 {c.cert?.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
