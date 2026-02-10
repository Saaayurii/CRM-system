import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: number;
    email: string;
    roleId: number;
    accountId: number;
    name: string;
  };
}
