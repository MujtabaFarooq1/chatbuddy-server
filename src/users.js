const connectedUser = [];

// joins the user to the specific chatroom
const joinChat = (socketId, user) => {
  connectedUser.push(user);
  console.log(connectedUser, "users");

  return user;
};

// Gets a particular user id to return the current user
const getUser = (id) => connectedUser.find((user) => user.id === id);

// called when the user leaves the chat and its user object deleted from array
const leaveChat = (id) => {
  const index = connectedUser.findIndex((user) => user.id === id);

  if (index !== -1) {
    return connectedUser.splice(index, 1)[0];
  }
};

module.exports = {
  joinChat,
  getUser,
  leaveChat,
};
