import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './page/Home';
import Register from './page/Register';
import Login from './page/Login';
import Message from './page/Message';
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/message" element={<Message />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signin" element={<Register />} />
            </Routes>
        </Router>
    );
};

export default App;
