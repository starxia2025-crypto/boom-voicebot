type HeaderProps = {
  branch: string;
};

export function Header({ branch }: HeaderProps) {
  return (
    <header className="hero-header">
      <div className="brand-row">
        <div className="brand-lockup">
          <img className="boom-logo" src="/boom-logo.jpg" alt="Muebles Boom" />
          <div>
            <h1>Boom Asistente</h1>
            <p>Consultas internas</p>
          </div>
        </div>
        <div className="connection-pill">
          <span className="status-dot" />
          Conectado
        </div>
      </div>
      <div className="branch-pill">
        <span className="store-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M4 10.5V20h16v-9.5M3 10l1.5-5h15L21 10a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 16 10a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0A2.5 2.5 0 0 1 3 10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>{branch}</span>
        <span className="chevron" aria-hidden="true">
          v
        </span>
      </div>
    </header>
  );
}
