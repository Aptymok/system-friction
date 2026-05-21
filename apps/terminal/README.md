# apps/terminal

Interfaz viva de campo, solo si se justifica separarla de `apps/observatory`.

Responsabilidad declarada:
- hospedar una superficie interactiva de campo;
- consumir contratos canonicos del observatorio;
- enviar comandos declarados hacia `services/api`.

Limites:
- no toca la ruta productiva `/terminal` actual;
- no calcula metricas canonicas;
- no persiste eventos directamente;
- puede clausurarse si la interfaz queda como ruta interna de `apps/observatory`.

