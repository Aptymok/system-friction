# salience_scheduler.py
import heapq

class SalienceScheduler:
    def __init__(self):
        self.priority_queue = []

    def add_task(self, task, salience: float):
        heapq.heappush(self.priority_queue, (-salience, id(task), task))

    def get_next_task(self):
        if self.priority_queue:
            return heapq.heappop(self.priority_queue)[2]
        return None

    def is_empty(self):
        return len(self.priority_queue) == 0
