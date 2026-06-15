// Logo oficial do TeleTudo (imagem em /public/logo.png)
export default function Logo({ size = 40 }) {
  return (
    <span
      className="brand-logo"
      style={{ width: size, height: size }}
      aria-label="TeleTudo"
    >
      <img src="/logo.svg" alt="TeleTudo" />
    </span>
  );
}
