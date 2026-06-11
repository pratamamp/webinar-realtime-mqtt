import { Routes, Route, Navigate } from "react-router";
import JoinPage from "./pages/JoinPage";
import PollForm from "./pages/PollForm";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import "./App.css"; // Ensure standard App.css doesn't break our dark theme

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" replace />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/poll" element={<PollForm />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/stats" element={<Stats />} />
    </Routes>
  );
}

export default App;
