# interaction_telemetry.py
import time
from collections import deque

class InteractionTelemetry:
    def __init__(self):
        self.reset()

    def reset(self):
        self.start_time = None
        self.key_events = []
        self.backspace_count = 0
        self.rewrites = 0
        self.abandoned = False
        self.focus_changes = []
        self.topic_durations = {}

    def start_interaction(self, topic=None):
        self.reset()
        self.start_time = time.time()
        if topic:
            self.focus_changes.append((time.time(), topic))

    def record_key(self, key, action='press'):
        if not self.start_time:
            return
        self.key_events.append((time.time(), key, action))
        if key == 'Backspace':
            self.backspace_count += 1

    def record_abandon(self):
        self.abandoned = True

    def change_topic(self, new_topic):
        now = time.time()
        if self.focus_changes:
            prev_topic, prev_time = self.focus_changes[-1][1], self.focus_changes[-1][0]
            duration = now - prev_time
            self.topic_durations[prev_topic] = self.topic_durations.get(prev_topic, 0) + duration
        self.focus_changes.append((now, new_topic))

    def finalize(self):
        if not self.start_time:
            return {}
        total_time = time.time() - self.start_time
        if self.focus_changes:
            last_topic, last_time = self.focus_changes[-1][1], self.focus_changes[-1][0]
            self.topic_durations[last_topic] = self.topic_durations.get(last_topic, 0) + (time.time() - last_time)
        typing_speed = len([e for e in self.key_events if e[1] not in ('Backspace', 'Enter')]) / max(0.01, total_time)
        return {
            'total_seconds': total_time,
            'backspaces': self.backspace_count,
            'rewrites_estimated': self.rewrites,
            'abandoned': self.abandoned,
            'typing_speed_cps': typing_speed,
            'topic_durations': self.topic_durations,
            'focus_switches': len(self.focus_changes)
        }
