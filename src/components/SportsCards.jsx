import f1 from "../assets/f1.jpg";
import fifa from "../assets/fifa.jpg";
import motogp from "../assets/motogp.jpg";

function SportsCards() {

  const openSite = (url) => {
    window.open(url, "_blank");
  };

  return (
    <section>

      <h2>Official Sports Websites</h2>

      <div className="cards">

        <a
          className="card"
          href="https://www.formula1.com"
          target="_blank"
          rel="noreferrer"
        >
          <img src={f1} alt="F1" />
          <h3>Formula 1</h3>
        </a>

        <a
          className="card"
          href="https://www.fifa.com"
          target="_blank"
          rel="noreferrer"
        >
          <img src={fifa} alt="FIFA" />
          <h3>FIFA</h3>
        </a>

        <a
          className="card"
          href="https://www.motogp.com"
          target="_blank"
          rel="noreferrer"
        >
          <img src={motogp} alt="MotoGP" />
          <h3>MotoGP</h3>
        </a>

      </div>

    </section>
  );
}

export default SportsCards;