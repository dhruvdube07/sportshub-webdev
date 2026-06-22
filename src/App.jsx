import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SportsCards from "./components/SportsCards";
import PopularSports from "./components/PopularSports";
import Footer from "./components/Footer";
import SurveyPage from "./components/SurveyPage";
import ChatPage from "./components/ChatPage";
import "./App.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero />
              <SportsCards />
              <PopularSports />
              <Footer />
            </>
          }
        />
        <Route
          path="/survey"
          element={
            <>
              <SurveyPage />
              <Footer />
            </>
          }
        />
        <Route
          path="/chat"
          element={
            <>
              <ChatPage />
              <Footer />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <Hero />
              <SportsCards />
              <PopularSports />
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
