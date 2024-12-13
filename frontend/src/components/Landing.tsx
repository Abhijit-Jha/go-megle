import { useState } from "react";
import { useNavigate } from "react-router";

const Landing = () => {
    const [name, setName] = useState<string>("")
    const navigate = useNavigate()
    const handleRooms = () => {
        if (!name) {
            alert("Please enter your name before joining the chat");
            return;
        }
        navigate(`/room?name=${encodeURIComponent(name)}`)
    }

    return (
        <div>
            <input placeholder='what should we call you?' type='text' onChange={
                (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)
            }></input>
            <button onClick={handleRooms} disabled={!name}>
                Talk to others
            </button>
        </div>
    )
}

export default Landing
