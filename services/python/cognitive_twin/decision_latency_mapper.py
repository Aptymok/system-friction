# decision_latency_mapper.py
import time
from collections import deque

class DecisionLatencyMapper:
    def __init__(self, window_size=20):
        self.latencies = deque(maxlen=window_size)
        self.current_start = None

    def start_decision(self):
        self.current_start = time.time()

    def end_decision(self):
        if self.current_start:
            latency = time.time() - self.current_start
            self.latencies.append(latency)
            self.current_start = None

    def get_trend(self):
        if len(self.latencies) < 3:
            return 'stable'
        x = list(range(len(self.latencies)))
        y = list(self.latencies)
        n = len(x)
        slope = (n*sum(x_i*y_i for x_i,y_i in zip(x,y)) - sum(x)*sum(y)) / (n*sum(x_i**2 for x_i in x) - sum(x)**2)
        if slope > 0.05:
            return 'increasing'
        elif slope < -0.05:
            return 'decreasing'
        else:
            return 'stable'

    def get_avg_latency(self):
        return sum(self.latencies)/len(self.latencies) if self.latencies else 0.0
