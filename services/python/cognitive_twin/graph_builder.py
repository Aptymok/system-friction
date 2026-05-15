# graph_builder.py
import networkx as nx

class CognitiveGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
    def add_node(self, node_id, node_type, properties):
        self.graph.add_node(node_id, type=node_type, **properties)
    def add_edge(self, from_id, to_id, relation, weight=1.0):
        self.graph.add_edge(from_id, to_id, relation=relation, weight=weight)
    def save(self, path='cognitive_graph.graphml'):
        nx.write_graphml(self.graph, path)
