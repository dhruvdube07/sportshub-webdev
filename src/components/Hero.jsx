import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <h1>ALL YOUR SPORTS IN ONE PLACE</h1>

      <p>
        Formula 1 • FIFA • MotoGP • Cricket
      </p>

      <button onClick={() => navigate("/survey")}>Explore Sports</button>
    </section>
  );
}

export default Hero;