// Socket.IO внутри одной вкладки: «сервер» и «клиент» обмениваются событиями
// напрямую. Данные проходят через structuredClone, как через сеть, а доставка
// асинхронная — порядок и поведение совпадают с настоящим сокетом.
const clone = (v) => (v === undefined ? v : structuredClone(v));
const later = (fn) => setTimeout(fn, 0);
let server = null;
let seq = 0;

class Emitter {
  constructor() {
    this.handlers = new Map();
  }
  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return this;
  }
  off(event, fn) {
    this.handlers.get(event)?.delete(fn);
    return this;
  }
  fire(event, ...args) {
    for (const fn of [...(this.handlers.get(event) || [])]) fn(...args);
  }
}

export class Server extends Emitter {
  constructor() {
    super();
    this.middleware = [];
    this.sockets = new Set();
    server = this;
  }
  use(fn) {
    this.middleware.push(fn);
  }
  to(room) {
    return { emit: (event, data) => this.broadcast((s) => s.rooms.has(room), event, data) };
  }
  emit(event, data) {
    this.broadcast(() => true, event, data);
  }
  broadcast(filter, event, data) {
    for (const s of this.sockets) if (filter(s)) s.client.receive(event, clone(data));
  }

  accept(client) {
    const socket = new ServerSocket(client);
    let i = 0;
    const next = (err) => {
      if (err) return client.receive('connect_error', err);
      const mw = this.middleware[i++];
      if (mw) return mw(socket, next);
      this.sockets.add(socket);
      this.fire('connection', socket);
      client.connected = true;
      client.receive('connect');
    };
    next();
    return socket;
  }
}

class ServerSocket extends Emitter {
  constructor(client) {
    super();
    this.id = `s${++seq}`;
    this.client = client;
    this.handshake = { auth: clone(client.auth) };
    this.data = {};
    this.rooms = new Set([this.id]);
  }
  join(room) {
    this.rooms.add(room);
  }
  leave(room) {
    this.rooms.delete(room);
  }
}

class ClientSocket extends Emitter {
  constructor(auth) {
    super();
    this.auth = auth;
    this.connected = false;
    later(() => {
      if (!this.closed) this.peer = server.accept(this);
    });
  }
  receive(event, data) {
    later(() => !this.closed && this.fire(event, data));
  }
  emit(event, data, ack) {
    later(() => {
      if (!this.connected) return;
      const reply = ack && ((res) => later(() => ack(clone(res))));
      this.peer.fire(event, clone(data), reply);
    });
    return this;
  }
  disconnect() {
    this.closed = true;
    if (this.connected) {
      this.connected = false;
      server.sockets.delete(this.peer);
      this.peer.fire('disconnect');
    }
    return this;
  }
}

export const io = (opts = {}) => new ClientSocket(opts.auth);
