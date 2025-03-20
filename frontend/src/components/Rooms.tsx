import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function Rooms(){
  const location = useLocation();
  const url = new URLSearchParams(location.search);
  const name = url.get("name");
  const [user1Name, setUser1Name] = useState<string>("");
  const [user2Name, setUser2Name] = useState<string>("");
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null); //to maintain persistent connections
  const video1 = useRef<HTMLVideoElement | null>(null);
  const video2 = useRef<HTMLVideoElement | null>(null);
  const senderPC = useRef<RTCPeerConnection | null>(null);
  const recieverPC = useRef<RTCPeerConnection | null>(null);

  const user1Media = useRef<MediaStream | null>(null);
  const user2Media = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (name && !socketRef.current) {
      setUser1Name(name);
      initiateMedia();
      initialiseWebSocket();
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
    senderPC.current = new RTCPeerConnection();
    if (!senderPC.current) {
      return;
    }
    console.log("peerconnnection", senderPC)


    senderPC.current.onnegotiationneeded = async () => {
      const offer = await senderPC.current?.createOffer();
      await senderPC.current?.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({
        type: "offer",
        sdp: offer
      }));
    }

    senderPC.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(JSON.stringify({
          type: "iceCandidate",
          candidate: event.candidate
        }));
      }
    }
  }

  const initiateMedia = async () => {
    console.log("Taking media permissions");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    user1Media.current = stream

    if (user1Media.current) {
      user1Media.current.getTracks().forEach((track) => {
        senderPC.current?.addTrack(track, stream);
      });
    } else {
      console.error("dsfasdfsd")
    }

    console.log("sdfa", user2Media.current)

    if (video1.current) {
      video1.current.srcObject = user1Media.current;
      await video1.current.play().catch(e => console.error("error hia")).then(e => console.warn("lad"));
    }

    console.log("user 1 media", user1Media.current);
  }

  const handleOffer = async (offer: RTCSessionDescription) => {
    recieverPC.current = new RTCPeerConnection();
    console.log(recieverPC.current, "sdfa");

    if (recieverPC.current) {
      recieverPC.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          user2Media.current?.addTrack(track)
        })
      }
    } else {
      console.error("nahi hua user2media add")
    }

    console.log("user2 media", user2Media.current);
    if (video2.current) {
      video2.current.srcObject = user2Media.current
      video2.current.play().then(() => console.log("hogya")).catch(e => console.error)
    }

    await recieverPC.current.setRemoteDescription(offer);
    const answer = await recieverPC.current.createAnswer();
    await recieverPC.current.setLocalDescription(answer);
    socketRef.current?.send(JSON.stringify({
      type: "answer",
      sdp: answer
    }));


    recieverPC.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
      }
    }
  }

  const handleAnswer = async (answer: RTCSessionDescription) => {
    if (!senderPC) {
      console.log("NO sender PC");
    }
    await senderPC.current?.setRemoteDescription(answer);
  }

  const handeleIceCandidate = async (iceCandidate: RTCIceCandidate) => {
    if (senderPC.current && senderPC.current.remoteDescription) {
      console.log("Adding ICE candidate to senderPC");
      await senderPC.current.addIceCandidate(iceCandidate);
    } else if (recieverPC.current && recieverPC.current.remoteDescription) {
      console.log("Adding ICE candidate to recieverPC");
      await recieverPC.current.addIceCandidate(iceCandidate);
    } else {
      console.error("No appropriate peer connection to add ICE candidate.");
    }
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
      <video ref={video1}></video>
      <video ref={video2}></video>
      {JSON.stringify(senderPC.current)}
    </div>
  );
}