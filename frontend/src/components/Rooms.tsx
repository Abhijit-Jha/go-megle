import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';


const Rooms = () => {
  const location = useLocation();
  const url = new URLSearchParams(location.search);
  const name = url.get("name");
  const [user1Name, setUser1Name] = useState<string>("");
  const [user2Name, setUser2Name] = useState<string>("");
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null); //to maintain persistent connections
  const [user1Stream, setUser1Stream] = useState<MediaStream | null>(null) //user1 is local
  const [user2Stream, setUser2Stream] = useState<MediaStream | null>(null) //user2 is peer
  const video1 = useRef<HTMLVideoElement | null>(null);
  const video2 = useRef<HTMLVideoElement | null>(null);
  const [senderPC, setSenderPC] = useState<RTCPeerConnection | null >(null);
  const [recieverPC, setRecieverPC] = useState<RTCPeerConnection  | null >(null);
  useEffect(() => {
    if (name && !socketRef.current) {
      setUser1Name(name);
      initiateMedia();
      initialiseWebSocket();
      console.log(user1Stream)
    }
  }, [name]);

  async function initialiseWebSocket() {
    socketRef.current = new WebSocket("ws://localhost:8080");
    socketRef.current.onopen = () => {
      console.log("Socket it open");
      socketRef.current?.send(JSON.stringify({
        name: name
      }));
    }

    socketRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'Paired':
          setIsPaired(true);
          setUser2Name(message.peer);
          sendOffer();
          break;
        case 'offer':
          handleOffer(message.sdp);
          break;
        case 'answer':
          handleAnswer(message.sdp);
          break;
        case 'iceCandidate':
          handeleIceCandidate(message.iceCandidate);
          break;
        case 'Disconnect':
          handleDisconnect();
          break;
      }
    }
  }


  const sendOffer = async () => {
    const peerConnection = new RTCPeerConnection();
    setSenderPC(peerConnection);
    console.log("peerconnnection sfaf: ",senderPC)
    console.log("initiating media")
    // peerConnection.onnegotiationneeded = async()=>{
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({
        type: "offer",
        sdp: offer
      }));
    // }
    console.log("user media",user1Stream)

  }

  const initiateMedia = async () => {
    // if (!senderPC) {
    //   console.log("no media initiated");
    //   return;
    // }
    console.log("Taking media permissions");
    
    const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })

    setUser1Stream(stream);
    
    // if (video1.current) {
    //   video1.current.srcObject = stream;
    //   await video1.current.play();
    // }

    // stream.getTracks().forEach((track) => {
    //   senderPC?.addTrack(track);
    // })

    // senderPC.ontrack = async (event) => {
    //   if (video2.current) {
    //     setUser2Stream(new MediaStream([event.track]));
    //     video2.current.srcObject = new MediaStream([event.track]);
    //     const video2play = video2.current.play();
    //     video2play.then(() => {
    //       console.log("Playing")
    //     }).catch(() => {
    //       console.log("No play")
    //     })
    //   }
    // }

    // senderPC.onicecandidate = (event) => {
    //   sendOffer();
    //   if (event.candidate) {
    //     socketRef.current?.send(JSON.stringify({
    //       type: "iceCandidate",
    //       candidate: event.candidate
    //     }));
    //   }
    // }
  }

  const handleOffer = async (offer: RTCSessionDescription) => {
    const peerConnection = new RTCPeerConnection();
    setRecieverPC(peerConnection);
    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer);
    socketRef.current?.send(JSON.stringify({
      type: "answer",
      sdp: answer
    }))
  }

  const handleAnswer = async (answer: RTCSessionDescription) => {
    if (!senderPC) {
      console.log("NO sender PC")
    }
    await senderPC?.setRemoteDescription(answer)
  }

  const handeleIceCandidate = async (iceCandidate: RTCIceCandidate) => {
    if (!senderPC) {
      console.log("NO pc");
      return;
    };
    senderPC.addIceCandidate(iceCandidate);
  };

  //handle Disconnection --> remove name and reload the page
  const handleDisconnect = async () => {
    window.location.reload();
  };


  return (
    <div>
      <h1>Room</h1>
      {isPaired && <p>Waiting for another user...</p>}
      <p>User 1: {user1Name}</p>
      <p>User 2: {user2Name ? user2Name : "Waiting for peer"}</p>
      {isPaired && <p>You're paired! Start chatting.</p>}
      <video ref={video1} autoPlay></video>
      <video ref={video2} autoPlay></video>
    </div>
  );
};

export default Rooms;
