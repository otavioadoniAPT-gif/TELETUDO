const COLORS = ['#2aabee', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#3498db', '#f39c12'];

function colorFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name = '', src, size = 40 }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.42,
    background: src ? 'transparent' : colorFor(name),
  };
  return (
    <div className="avatar" style={style}>
      {src ? <img src={src} alt={name} /> : initial}
    </div>
  );
}
