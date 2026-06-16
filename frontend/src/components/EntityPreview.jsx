import { previewSegments } from '../utils.js';

// Mostra o texto com os custom emojis (que o navegador não anima) trocados
// por um chip "🎬 + emoji base", indicando que serão preservados no envio.
export default function EntityPreview({ text, entities, className }) {
  const segs = previewSegments(text || '', entities || []);
  if (!segs.length) return <span className="muted">(sem texto)</span>;
  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.type === 'emoji' ? (
          <span key={i} className="emoji-chip" title="emoji animado — preservado no envio">
            🎬{s.value}
          </span>
        ) : (
          <span key={i}>{s.value}</span>
        )
      )}
    </span>
  );
}
