import {BrowserRouter,Routes,Route} from "react-router-dom"
import Landing from "./components/Landing"
import Rooms from "./components/Rooms"
function App() {
  return <BrowserRouter>
  <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/room" element={<Rooms/>}/ >
  </Routes>
  </BrowserRouter>
}

export default App