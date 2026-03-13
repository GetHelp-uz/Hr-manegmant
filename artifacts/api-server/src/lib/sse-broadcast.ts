import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(500);

export type SseEvent = {
  type: "attendance" | "ping";
  companyId: number;
  data: any;
};

export function broadcastAttendance(companyId: number, data: any) {
  emitter.emit(`company:${companyId}`, { type: "attendance", companyId, data });
}

export function subscribeCompany(companyId: number, cb: (evt: SseEvent) => void) {
  emitter.on(`company:${companyId}`, cb);
  return () => emitter.off(`company:${companyId}`, cb);
}
