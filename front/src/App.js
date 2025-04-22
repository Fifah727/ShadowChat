import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './page/Home';
import Chat from './page/Chat';
import Register from './page/Register';
import Login from './page/Login';
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signin" element={<Register />} />
            </Routes>
        </Router>
    );
};

export default App;
