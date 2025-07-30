import Signup from './components/Signup';
import Login from './components/Login';
import Home from './components/Home';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SeniorHome from './components/SeniorHome';


function App() {
  return (
 <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/SeniorHome" element={<SeniorHome />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
