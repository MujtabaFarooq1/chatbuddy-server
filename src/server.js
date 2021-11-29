const express = require("express");
const app = express();
const http = require("http");
const color = require("colors");
const cors = require("cors");

const { Server } = require("socket.io");

const Chat = require("./models/chat");
const { join } = require("path");

// middle wares
app.use(express());
app.use(cors());

//
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
// const { getUser, leaveChat, joinChat } = require("./users");
const port = 3000;

const users = {};
const chatHistory = {};

// Setting up the server
server.listen(
  port,
  console.log(`Server is running on the port no: ${port} `)
);

// Middleware for  placing uid in socket
io.use((socket, next) => {
  const uid = socket.handshake.auth.uid;
  if (!uid) {
    return next(new Error("invalid userID"));
  }
  socket.uid = uid;
  next();
});

//initializing the socket io connection
io.on("connection", (socket) => {
  socket.emit("new-user-conected");

  // console.log("Sokets are as follows ", io.sockets);

  socket.on("login", ({ uid }) => {
    // users[socket.id] = uid;

    users[uid] = { joinedRooms: [] };
  });

  socket.on("join-my-room", ({ myRoomId }) => {
    socket.join(myRoomId);
  });

  socket.on("join-room", async ({ roomToJoin, friendsRoomId, myRoomId }) => {
    // console.log(`joining room ${roomToJoin}`);
    // console.log(`frnd room ${friendsRoomId}`);
    // console.log(`my room ${myRoomId}`);
    // console.log("-----------------");
    await socket.join(roomToJoin);

    if (chatHistory[roomToJoin]) {
      chatHistory[roomToJoin].users += 1;
    } else {
      chatHistory[roomToJoin] = new Chat(1);
    }

    users[myRoomId]?.joinedRooms
      ? users[myRoomId].joinedRooms.push(roomToJoin)
      : (users[myRoomId] = { joinedRooms: [myRoomId] });

    socket.emit("initialMessages", {
      initialChatMessages: chatHistory[roomToJoin].chatMessages,
    });
  });

  socket.on("room-msg", ({ to, message, from, forRoomId }) => {
    //
    chatHistory[to].chatMessages.push(message);

    socket.broadcast.to(to).emit("room-msg-recieve", {
      message,
      from,
    });

    //Notify Friend
    socket.to(forRoomId).emit("msg-notify", {
      message: `You have a new message !`,
      from,
    });
  });

  socket.on("leave-room", ({ roomToLeave, leavingPerson }) => {
    delete users[leavingPerson];

    if (chatHistory[roomToLeave]) {
      chatHistory[roomToLeave].users -= 1;
      chatHistory[roomToLeave].users < 1 && delete chatHistory[roomToLeave];
    }

    // console.log("chat history on leaving room", chatHistory);
  });

  socket.on("disconnect", (e) => {
    users[socket.uid]?.joinedRooms.forEach((joinedRoomId) => {
      if (chatHistory[joinedRoomId]) {
        chatHistory[joinedRoomId].users -= 1;
        // console.log("on disconect", chatHistory[joinedRoomId]?.users);
        chatHistory[joinedRoomId].users < 1 && delete chatHistory[joinedRoomId];
      }
    });

    // delete users[socket.uid];
  });

  socket.on("getRoomMsgs", ({ to }) => {
    socket.to(to).emit("setRoomMsgs", {
      messages: "chatHistory[to].chatMessages",
    });
  });

  //Calling stuff starts here
  socket.on("callUser", ({ initiatorId, initiatorName, to }) => {
    if (to?.length > 1) {
      const filteredUsers = to.filter(
        (connectionObj) => connectionObj.uid !== initiatorId
      );

      filteredUsers.forEach((connectionObj) => {
        io.to(connectionObj.uid).emit("callUser", {
          initiatorName,
          initiatorId,
          to,
        });
      });
    }
    // io.to(to).emit("callUser", {
    //   fromUserName,
    //   from,
    //   to,
    //   signalFrom,
    //   signalTo,
    // });
  });

  socket.on(
    "aceept-and-open-communication-for-connected-users",
    ({ acceptedByUserId, updatedToList }) => {
      updatedToList.forEach((connectionObj) => {
        if (connectionObj.uid !== acceptedByUserId && connectionObj.connected) {
          io.to(connectionObj.uid).emit("some-user-accepted-call", {
            updatedToList,
            acceptedByUserId,
          });
        }
      });
    }
  );

  //Rejecting a call
  socket.on("reject-call", ({ rejectedBy, rejectedTo }) => {
    const callRejectedToList = rejectedTo?.filter(
      (connectionObj) => connectionObj.uid !== rejectedBy
    );

    if (callRejectedToList?.length > 0) {
      callRejectedToList.forEach((connectionObj) => {
        io.to(connectionObj.uid).emit("reject-call", {
          rejectedBy,
          rejectedTo: callRejectedToList,
        });
      });
    }
    // io.to(rejectedTo).emit("reject-call", { rejectedBy });
  });

  //End ---------
});
