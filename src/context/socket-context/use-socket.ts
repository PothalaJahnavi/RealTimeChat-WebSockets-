import { useContext } from "react";
import { SocketContext } from "./context";

export const useSocket = () => useContext(SocketContext);