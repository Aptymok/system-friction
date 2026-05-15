export type Node = {
  id: string;
  alias: string;
  metrics: any;
  permissions: string[];
  memory: any[];
  actions: any[];
  createdAt: number;
};

let CURRENT_NODE: Node | null = null;

export function setNode(node: Node) {
  CURRENT_NODE = node;
}

export function getNode() {
  return CURRENT_NODE;
}

export function isVisitor() {
  return CURRENT_NODE === null;
}