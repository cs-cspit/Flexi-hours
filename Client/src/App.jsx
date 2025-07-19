import Signup from './components/Signup';
import Login from './components/Login';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {
  return (
 <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
