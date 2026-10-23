export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="nexora-logo" aria-label="Nexora Studio">
      <svg className="nexora-symbol" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <defs><linearGradient id="logo-gradient" x1="2" y1="4" x2="34" y2="32"><stop stopColor="#7C9AFF"/><stop offset="1" stopColor="#AA72FF"/></linearGradient></defs>
        <path d="M6 27.5V8.5L17.8 27.5V8.5" stroke="url(#logo-gradient)" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 27.5L30 8.5V27.5" stroke="url(#logo-gradient)" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && <span className="nexora-wordmark">NEXORA<span>STUDIO</span></span>}
    </div>
  );
}