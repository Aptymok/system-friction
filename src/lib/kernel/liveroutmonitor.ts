import { recordFriction } from "./frictionMemory";

export function monitorRoute(event: any, routeName: string) {
  if (!event?.type || event.type === "unknown") {
    recordFriction({
      type: "INVALID_EVENT",
      route: routeName,
    });
  }

  if (event?.payload?.error) {
    recordFriction({
      type: "ROUTE_ERROR",
      route: routeName,
    });
  }
}