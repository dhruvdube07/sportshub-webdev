import iphone from "../assets/iphone.jpg";
import macbook from "../assets/macbook.jpg";
import airpods from "../assets/airpods.jpg";

function Products() {
  return (
    <section>
      <h2>Featured Products</h2>

      <div className="cards">

        <div className="card">
          <img src={iphone} alt="iPhone" />
          <h3>iPhone 16</h3>
          <p>₹79,999</p>
        </div>

        <div className="card">
          <img src={macbook} alt="MacBook" />
          <h3>MacBook Air</h3>
          <p>₹99,999</p>
        </div>

        <div className="card">
          <img src={airpods} alt="AirPods" />
          <h3>AirPods Pro</h3>
          <p>₹14,999</p>
        </div>

      </div>
    </section>
  );
}

export default Products;