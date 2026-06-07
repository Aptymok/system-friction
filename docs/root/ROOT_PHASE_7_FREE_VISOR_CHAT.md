# ROOT Phase 7 - Chat libre del Visor

## Alcance cerrado

Fase 7 habilita el chat libre del Visor como interlocutor operativo, no como inventario ni ejecutor.

Se agrego `src/lib/root/rootVisorClassifier.ts` para clasificar consultas como:

- registro visible
- ausencia de registro
- conocimiento general
- inferencia
- senal nueva
- posible evidencia
- candidato a patron
- hipotesis
- senal personal

## Integracion

Se actualizo `src/observatory/components/root/visorHooks.ts` para enviar la clasificacion al proveedor de IA cuando existe y para usarla en respuestas locales. Tambien se actualizo `src/observatory/components/root/VisorChat.tsx` para mostrar la clasificacion de la respuesta cuando aplica.

## Reglas respetadas

- Si algo esta registrado, el Visor puede leerlo como registro.
- Si no esta registrado, lo declara como ausencia, inferencia, conocimiento general o hipotesis.
- Senales personales o corporales se tratan como conversacion o senal nueva, no como diagnostico ni evidencia institucional.
- Propuestas aceptadas no se tratan como acciones ejecutadas.
- Simulaciones, pruebas y sandbox no sostienen regimen ni atractor.

## Pendiente fuera de esta fase

No se modifico Twin mas alla de lectura del estado visible. No se crearon Acciones de Realidad ni se agrego escritura de registros desde el chat.
