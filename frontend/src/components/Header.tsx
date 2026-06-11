export function Header() {
  return (
    <header className="hero-header">
      <div className="device-status-bar" aria-hidden="true">
        <span>19:46</span>
        <div className="status-icons">
          <span className="status-signal" />
          <span className="status-wifi" />
          <span className="status-battery" />
        </div>
      </div>
      <div className="brand-row">
        <div className="brand-lockup">
          <img className="boom-logo" src="/boom-logo.jpg" alt="Muebles Boom" />
          <div className="brand-copy">
            <h1>Boom Asistente</h1>
            <p>Consultas internas</p>
          </div>
        </div>
        <div className="connection-pill">
          <span className="status-dot" />
          Conectado
        </div>
      </div>
    </header>
  );
}
