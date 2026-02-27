import { Routes, Route, Link } from 'react-router-dom'
import ToastContainer from './components/Toast'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Exam from './pages/Exam'
import ExamSession from './pages/ExamSession'
import ExamResult from './pages/ExamResult'
import Practice from './pages/Practice'
import PracticeSession from './pages/PracticeSession'
import Progress from './pages/Progress'
import Admin from './pages/Admin'

function Nav() {
  return (
    <nav className="flex gap-4 p-4 border-b bg-gray-50">
      <Link to="/setup" className="text-blue-600 hover:underline">Setup</Link>
      <Link to="/" className="text-blue-600 hover:underline">Home</Link>
      <Link to="/exam" className="text-blue-600 hover:underline">Exam</Link>
      <Link to="/practice" className="text-blue-600 hover:underline">Practice</Link>
      <Link to="/progress" className="text-blue-600 hover:underline">Progress</Link>
      <Link to="/admin" className="text-blue-600 hover:underline">Admin</Link>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="p-4">
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/" element={<Home />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/exam/session/:sessionId" element={<ExamSession />} />
          <Route path="/exam/result" element={<ExamResult />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/session/:sessionId" element={<PracticeSession />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <ToastContainer />
    </>
  )
}
