// Logo do TeleTudo — balão de chat branco dentro de um quadrado azul arredondado
// (inspirado na identidade "Aposta Tudo")
export default function Logo({ size = 40 }) {
  const id = 'tt-grad';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b6bff" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${id})`} />
      {/* balão de chat */}
      <path
        d="M13 16.5C13 14.567 14.567 13 16.5 13h15c1.933 0 3.5 1.567 3.5 3.5v9c0 1.933-1.567 3.5-3.5 3.5H22l-6 5v-5h-0.5C14.567 29 13 27.433 13 25.5v-9z"
        fill="#ffffff"
      />
      {/* três pontos */}
      <circle cx="19.5" cy="21" r="1.8" fill="#2563eb" />
      <circle cx="24" cy="21" r="1.8" fill="#2563eb" />
      <circle cx="28.5" cy="21" r="1.8" fill="#2563eb" />
    </svg>
  );
}
