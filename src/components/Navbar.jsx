import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" aria-label="Home">
        <span role="img" aria-hidden="true">🏆</span> SportsHub
      </Link>

      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/survey">Survey</Link>
        </li>
        <li>
          <Link to="/chat">Chat</Link>
        </li>
        <li>
          <a href="https://www.formula1.com" target="_blank" rel="noreferrer">F1</a>
        </li>
        <li>
          <a href="https://www.fifa.com" target="_blank" rel="noreferrer">FIFA</a>
        </li>
        <li>
          <a href="https://www.motogp.com" target="_blank" rel="noreferrer">MotoGP</a>
        </li>
        <li>
          <a href="https://www.icc-cricket.com" target="_blank" rel="noreferrer">Cricket</a>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
