# dashboard.py
import plotly.express as px
import pandas as pd
from sqlalchemy.orm import Session
from models import StructuredObservation, Episode

def generate_dashboard(user_id: str, db: Session):
    obs = db.query(StructuredObservation).filter_by(user_id=user_id).order_by(StructuredObservation.observed_at).all()
    if not obs:
        return "<p>No hay datos suficientes para generar dashboard.</p>"
    df = pd.DataFrame([(o.observed_at, o.observation_type, o.value) for o in obs],
                      columns=['timestamp', 'type', 'value'])
    fig = px.line(df, x='timestamp', y='value', color='type', title='Evolución cognitiva')
    return fig.to_html()
