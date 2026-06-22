function PopularSports() {

  const openSite = (url) => {
    window.open(url, "_blank");
  };

  return (
    <section>

      <h2>Popular Sports</h2>

      <div className="popular">

        <a href="https://www.icc-cricket.com" target="_blank" rel="noreferrer">
          🏏 Cricket
        </a>

        <a href="https://www.atptour.com" target="_blank" rel="noreferrer">
          🎾 Tennis
        </a>

        <a href="https://www.nba.com" target="_blank" rel="noreferrer">
          🏀 NBA
        </a>

        <a href="https://www.ufc.com" target="_blank" rel="noreferrer">
          🥊 UFC
        </a>

      </div>

    </section>
  );
}

export default PopularSports;