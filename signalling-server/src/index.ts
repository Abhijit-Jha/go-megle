import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 })
interface User {
    name: string,
    socket: WebSocket
}

interface Group {
    user1: User,
    user2: User
}
let queueOfUsers: Array<User> = []
let roomMap: Map<Number, Group> = new Map()
let ROOMS: number = 0
wss.on("connection", (ws) => {
    console.log("connected")
    ws.on("message", (message) => {
        //getting the name from the frontend and add the user to the queue

        const data = JSON.parse(message.toString())
        if (data.name) {
            const user: User = {
                name: data.name,
                socket: ws
            }
            console.log("name is send")
            queueOfUsers.push(user)
        }
        if (queueOfUsers.length >= 2) {
            const [user1, user2] = queueOfUsers.splice(0, 2)

            user1.socket.send(JSON.stringify({ type: "Paired", peer: user2.name }));
            user2.socket.send(JSON.stringify({ type: "Paired", peer: user1.name }));
            const roomId = ROOMS++;
            const room: Group = {
                user1,
                user2
            }
            roomMap.set(roomId, room)
            console.log("A room is created", roomMap)
            signallingServer(user1.socket, user2.socket);
        } else {
            console.log("Waiting for a peer to connect!!")
        }

    })
    ws.on("close", () => {
        queueOfUsers = queueOfUsers.filter((user) => user.socket !== ws);

        console.log("A user disconnected");

        roomMap.forEach((group, roomId) => {
            if (group.user1.socket === ws || group.user2.socket === ws) {
                const otherUser = group.user1.socket === ws ? group.user2 : group.user1;
                otherUser.socket.send(JSON.stringify({ type: "Disconnected", name: group.user1.name }));
                roomMap.delete(roomId);
                if (group.user1.socket == ws) {
                    queueOfUsers.push(group.user2)
                } else {
                    queueOfUsers.push(group.user1)
                }
                console.log(`Room ${roomId} removed due to disconnection`);
            }
        });
        if (ROOMS <= 1) ROOMS = 0
        else ROOMS--;
    })
})


function signallingServer(socket1: WebSocket, socket2: WebSocket) {
    socket1.on("message", (data) => {
        const message = JSON.parse(data.toString())
        switch (message.type) {
            case "offer":
                console.log("offer from user1", message)
                socket2.send(JSON.stringify({ type: "offer", sdp: message.sdp }));
                break;
            case "answer":
                console.log("answer from user1", message)
                socket2.send(JSON.stringify({ type: "answer", sdp: message.sdp }));
                break;
            case "iceCandidate":
                console.log("candidate from user1", message)
                socket2.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate }));
                break;
        }
    })


    socket2.on("message", (data) => {
        const message = JSON.parse(data.toString())
        switch (message.type) {
            case "offer":
                console.log("offer from user2", message)
                socket1.send(JSON.stringify({ type: "offer", sdp: message.sdp }));
                break;
            case "answer":
                console.log("answer from user2", message)
                socket1.send(JSON.stringify({ type: "answer", sdp: message.sdp }));
                break;
            case "iceCandidate":
                console.log("iceCandidate from user2", message)
                socket1.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate }));
                break;
        }
    })
}
