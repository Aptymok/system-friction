import { registerOperator } from "./operatorRegistry";

let syntheticCounter = 0;

export function synthesizeOperator(pattern: any) {
  syntheticCounter++;

  const name = `synthetic_op_${syntheticCounter}`;

  // creación dinámica basada en patrón
  const fn = async (context: any) => {
    if (pattern.divergence > 0.7) {
      return { ...context, mitigated: true, op: name };
    }

    if (pattern.errorRate > 0.5) {
      return { ...context, sanitized: true, op: name };
    }

    return { ...context, passthrough: true, op: name };
  };

  registerOperator(name, fn);

  return name;
}