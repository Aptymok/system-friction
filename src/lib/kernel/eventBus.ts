type Event = {
  type: string;
  payload: any;
};

const listeners: Function[] = [];

export function emit(event: Event) {
  listeners.forEach((fn) => fn(event));
}

export function subscribe(fn: Function) {
  listeners.push(fn);
}