export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead';
  ports: string;
  createdAt: string;
  uptime: string;
}

export interface ContainerLogEvent {
  timestamp: string;
  message: string;
}
