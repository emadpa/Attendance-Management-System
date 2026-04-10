import { io } from "socket.io-client";
import { PORT } from "./constants/port";

const socket = io(`http://localhost:${PORT}`, {
  withCredentials: true,
  autoConnect: true,
});

export default socket;
