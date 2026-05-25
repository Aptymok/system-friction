type Operator = (context: any, executor: any) => Promise<any> | any;

const registry: Record<string, Operator> = {};

export function registerOperator(name: string, fn: Operator) {
  registry[name] = fn;
}

export function getOperator(name: string): Operator {
  return registry[name];
}

export function hasOperator(name: string) {
  return !!registry[name];
}