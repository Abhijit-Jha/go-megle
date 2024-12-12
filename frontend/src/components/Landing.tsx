import { useState } from "react";
import { useNavigate } from "react-router";

const Landing = () => {
    const [name, setName] = useState<string>("")
    const navigate = useNavigate()
    const handleRooms = () => {
        navigate(`/room/name?${name}`)
        const ws = new WebSocket("ws://localhost:8080")
        ws.onopen = ()=>{
            ws.send(JSON.stringify({
                name : name
            }))
        }
    }


    return (
        <div>
            <input placeholder='what should we call you?' type='text' onChange={
                (e: any) => setName(e.target.value)
            }></input>
            <button onClick={handleRooms} >
                Talk to others
            </button>
        </div>
    )
}

export default Landing
