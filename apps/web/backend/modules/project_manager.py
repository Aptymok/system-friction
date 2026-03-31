"""
Project Manager – Gestión de proyectos musicales en System Friction.

Regla de Oro: SIEMPRE llama mihm.apply_delta() antes de devolver datos.
Retardo: τ_pm = 1800 s (30 minutos) para coordinación de equipo.
"""

from datetime import datetime


class ProjectManager:
    TAU_PM = 1800  # 30 minutos

    def __init__(self, mihm):
        self.mihm = mihm
        self.projects = {}

    def create_project(self, name: str, members: list, deadline_days: int) -> dict:
        """
        Crea un nuevo proyecto y aplica delta al MIHM.
        """
        complexity = min(1.0, len(members) / 10.0)
        urgency = min(1.0, 1.0 / max(1, deadline_days / 30.0))

        project = {
            'id':            f"proj_{len(self.projects) + 1}",
            'name':          name,
            'members':       members,
            'deadline_days': deadline_days,
            'complexity':    complexity,
            'urgency':       urgency,
            'status':        'active',
            'created_at':    datetime.utcnow().isoformat(),
        }
        self.projects[project['id']] = project

        delta = {
            'r':   0.05 * (1.0 - complexity),  # proyectos simples aumentan R
            'nti': 0.08 * urgency,
        }

        u, J = self.mihm.apply_delta(
            delta,
            delay_seconds=self.TAU_PM,
            action=f"pm_create:{name[:30]}"
        )
        self.mihm.meta_control()

        return {
            'project':       project,
            'delta_enqueued': delta,
            'delay_seconds': self.TAU_PM,
            'u':             u,
            'cost_j':        J,
            'mihm_state':    dict(self.mihm.state),
            'irc':           self.mihm.irc,
            'timestamp':     datetime.utcnow().isoformat(),
        }

    def update_task(self, project_id: str, task: str, done: bool) -> dict:
        """
        Actualiza una tarea de un proyecto. Las tareas completadas mejoran R.
        """
        if project_id not in self.projects:
            return {'error': f"Project {project_id} not found"}

        progress_delta = 0.03 if done else -0.01
        delta = {'r': progress_delta, 'ml_success': 0.01 if done else 0.0}

        u, J = self.mihm.apply_delta(delta, action=f"pm_task:{task[:30]}:{done}")
        self.mihm.meta_control()

        return {
            'project_id':   project_id,
            'task':         task,
            'done':         done,
            'delta_applied': delta,
            'u':            u,
            'cost_j':       J,
            'mihm_state':   dict(self.mihm.state),
            'timestamp':    datetime.utcnow().isoformat(),
        }

    def list_projects(self) -> list:
        return list(self.projects.values())
