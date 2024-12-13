import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const Rooms = () => {
  const location = useLocation();
  const url = new URLSearchParams(location.search);
  const name = url.get("name");
  const [user1Name, setUser1Name] = useState<string>("");
  const [user2Name, setUser2Name] = useState<string>("");
  const [paired, setPaired] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null); //to maintain persistent connections
  const [pc, setPC] = useState<RTCPeerConnection | null>(null);
  const [user1Stream, setUser1Stream] = useState<MediaStream | null>(null)
  const [user2Stream, setUser2Stream] = useState<MediaStream | null>(null)
  const video1 = useRef<HTMLVideoElement | null>(null)
  const video2 = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    getUserMedia()
    socketRef.current = new WebSocket("ws://localhost:8080");

    socketRef.current.onopen = () => {
      setUser1Name(name ? name : "");
      socketRef.current?.send(
        JSON.stringify({
          name: name,
        })
      );
    };

    socketRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      // Handle pairing
      if (message.type === "Paired") {
        const user2 = JSON.parse(message.peer).name;
        console.log("Paired with ", user2);
        setPaired(true);
        setUser2Name(user2);
      }

      // Handle WebRTC offer
      if (message.type === "offer") {
        if (!pc) {
          const peerConnection = new RTCPeerConnection();
          setPC(peerConnection);

          peerConnection.onnegotiationneeded = async () => {
            try {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              socketRef.current?.send(
                JSON.stringify({ type: "offer", sdp: offer.sdp })
              );
            } catch (error) {
              console.error("Error creating offer: ", error);
            }
          };

          peerConnection.onicecandidate = (event: any) => {
            if (event.candidate) {
              socketRef.current?.send(
                JSON.stringify({
                  type: "iceCandidate",
                  candidate: event.candidate,
                })
              );
            }
          };

          peerConnection.ontrack = async (event: RTCTrackEvent) => {
            if (video2.current) {
              const stream: MediaStream = new MediaStream([event.track]);
              video2.current.srcObject = stream;
              await video2.current.play();
              setUser2Stream(stream);
            }
          }
        }
      }

      // Handle WebRTC answer
      else if (message.type === "answer" && pc) {
        try {
          await pc.setRemoteDescription(message.sdp);
        } catch (error) {
          console.error("Error setting remote description: ", error);
        }
      }

      // Handle ICE candidate
      else if (message.type === "iceCandidate" && pc) {
        try {
          await pc.addIceCandidate(message.candidate);
        } catch (error) {
          console.error("Error adding ICE candidate: ", error);
        }
      } else if (message.type == "Disconnected") {
        setUser2Name("")
      }
    };
    //sending video and audio



    return () => {
      socketRef.current?.close();
      console.log("WebSocket closed");
    };
  }, [name, pc]);

  async function getUserMedia() {
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setUser1Stream(stream);
      stream.getTracks().forEach((track) => {
        pc?.addTrack(track)
      })
      if (video1.current) {
        video1.current.srcObject = stream;
        await video1.current.play();
      }
    } catch (error) {
      console.error("Error accessing media devices", error);
    }
  }


  return (
    <div>
      <h1>Room</h1>
      {!paired && <p>Waiting for another user...</p>}
      <p>User 1: {user1Name}</p>
      <p>User 2: {user2Name ? user2Name : "Waiting for peer"}</p>
      {paired && <p>You're paired! Start chatting.</p>}
      <video ref={video1} autoPlay></video>
      <video ref={video2} autoPlay></video>
    </div>
  );
};

export default Rooms;
