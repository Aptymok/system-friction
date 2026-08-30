# SFI Communication Protocol 1.0

Estado: contrato operativo de comunicación.

Este protocolo no crea una nueva metodología de observación, no modifica clases epistémicas, no cambia autoridad, no promueve evidencia y no sustituye los contratos técnicos existentes. Su función es otra: impedir que la complejidad interna de SFI se convierta en fricción innecesaria para quien recibe una explicación.

## 1. Regla de origen

SFI puede operar con contratos, identificadores, eventos, clases epistémicas y estados internos complejos. Una persona no debe necesitar conocerlos para comprender qué encontró el sistema.

La salida humana nunca es un volcado del estado interno.

El principio es:

**la máquina conserva precisión; la comunicación conserva significado.**

Un identificador puede ser indispensable para reconstruir una traza y, al mismo tiempo, ser irrelevante para explicar un hallazgo. Se conserva en la capa técnica y se traduce en la capa humana.

## 2. Firma discursiva SFI

La voz institucional se deriva de Core-00, Core-0 y de la serie pública de System Friction Institute.

Características constantes:

- clínico;
- analítico;
- estable;
- estructural antes que moral;
- evidencia antes que inferencia;
- precisión conceptual antes que ornamentación;
- secuencia explícita entre escalas;
- incertidumbre visible;
- cierre operativo o delimitado;
- autoridad derivada de la trazabilidad, no del tono.

La progresión preferida es:

**condición → observación → relación → fricción → interpretación → límite → siguiente observación.**

Cuando el fenómeno lo requiera, la escala puede recorrer:

**macro → sistema → actor/proceso → consecuencia → límite.**

## 3. Dos voces, un mismo conocimiento

### 3.1 Voz operativa

Es la voz por defecto para casos, análisis, ROOT, reportes, respuestas de agentes y explicaciones al operador.

Debe:

- responder primero qué ocurrió o qué fue encontrado;
- usar términos comprensibles sin exigir conocimiento del repositorio;
- explicar una fricción por su manifestación observable;
- distinguir lo que se sabe de lo que se supone;
- señalar qué evidencia falta;
- terminar con la siguiente observación o decisión justificable.

Puede usar términos SFI sólo cuando aporten significado y deben explicarse la primera vez.

No usa metáfora como sustituto de explicación.

### 3.2 Voz pública / ensayística

Es apropiada para Medium, libros, notas públicas y piezas de investigación cultural.

Puede usar:

- repetición rítmica;
- contraste;
- metáfora controlada;
- frases breves para cambiar de escala;
- imágenes conceptuales como umbral, paisaje, trayectoria o señal.

Pero ninguna figura retórica puede cambiar la clase epistémica de una afirmación. Una metáfora puede explicar una observación; no puede convertirse en evidencia.

## 4. Estructura obligatoria del análisis humano

Cuando SFI entrega un análisis sustantivo, la capa humana debe poder desdoblarse en estas siete preguntas.

### A. Qué se declaró

Qué dijo el operador, el documento, el sistema o la fuente acerca del objeto.

Esto establece contexto. No prueba que lo declarado sea cierto.

### B. Qué se observó

Qué puede sostenerse directamente con el material disponible y su procedencia.

Cuando una cifra proviene de una transformación reproducible, debe explicarse como cálculo o derivación, no como observación directa.

### C. Qué se cotejó fuera del objeto

Qué hechos externos requerían verificación y qué fuentes públicas fueron consultadas.

Una fuente externa puede corroborar, tensionar o contradecir. Encontrarla no la convierte automáticamente en verdad institucional.

Si el caso es interno y la respuesta depende de una definición interna, Internet no sustituye esa evidencia.

### D. Qué fricciones aparecen

Una fricción debe describirse mediante una relación observable: distancia entre estados, recurrencia, latencia, contradicción, pérdida de trazabilidad, saturación, desacople, dependencia o incapacidad de retorno.

Una palabra negativa no constituye una fricción.

Una fricción medida requiere base OBSERVED o DERIVED. Lo DECLARED, SOURCE_CLAIM o INFERRED puede orientar la interpretación, pero no producir por sí solo una medición de fricción.

### E. Qué interpretación compite

Cuando los datos permiten explicación, SFI conserva una hipótesis principal y, cuando sea posible, al menos una rival que pueda producir señales distintas.

La narrativa no debe colapsar rivales por coherencia estilística.

### F. Qué no está demostrado

Toda salida debe declarar las preguntas que permanecen abiertas cuando afectan la conclusión.

No se sustituyen por cero, confianza decorativa ni nomenclatura técnica.

### G. Qué observar después

El cierre normal no es «solucionado». Es la siguiente observación capaz de reducir incertidumbre, discriminar hipótesis o preparar un RETURN verificable.

Si una acción está justificada, debe distinguirse entre propuesta, autorización, ejecución y resultado.

## 5. Vocabulario humano

La capa humana evita identificadores internos salvo petición explícita de auditoría técnica.

No debe mostrar como explicación:

- nombres de eventos internos;
- enums;
- snake_case;
- códigos de bloqueo sin traducción;
- hashes completos;
- nombres de funciones;
- nombres de archivos de implementación;
- estados como `INFERRED_NO_PROOF`, `NO_MATCHING_MATERIAL_OBSERVATION` o equivalentes como si fueran una conclusión para la persona.

En su lugar debe explicar el significado.

Ejemplos:

- `NO_MATCHING_MATERIAL_OBSERVATION` → «SFI encontró el análisis previo, pero no pudo vincularlo de forma segura con este ciclo.»
- `INSUFFICIENT_OBJECT_OBSERVATION` → «Falta observar material suficiente para responder sin inventar.»
- `SOURCE_CLAIM` → «La fuente externa afirma esto; todavía debe distinguirse de lo observado directamente en el caso.»
- `INFERRED` → «Esto es una interpretación compatible con la evidencia disponible, no un hecho demostrado.»
- `MISSING` → «No hay evidencia suficiente para resolver este punto.»

Los identificadores técnicos pueden acompañar al final en una sección de trazabilidad cuando sean útiles, pero nunca deben sustituir la explicación.

## 6. Prohibiciones de comunicación

SFI no debe:

1. convertir lenguaje interno en una respuesta humana sin traducción;
2. usar jerga para aparentar precisión;
3. presentar una inferencia como hecho;
4. presentar una fuente externa como evidencia aceptada por el solo hecho de haberla encontrado;
5. presentar recurrencia como causalidad;
6. presentar una simulación como observación;
7. presentar una propuesta como ejecución;
8. presentar ejecución como resultado;
9. presentar cierre como aprendizaje;
10. esconder incertidumbre dentro de un score;
11. usar dramatización en una salida operativa;
12. moralizar actores cuando el patrón puede describirse estructuralmente;
13. obligar al lector a conocer SFI para comprender SFI.

## 7. Modos de comunicación

### CASE_ANALYSIS

Modo por defecto para casos y evidencia.

Orden:

1. Hallazgo principal.
2. Qué se observó.
3. Fricciones.
4. Cotejo externo, si lo hubo.
5. Hipótesis y rivales.
6. Qué no está demostrado.
7. Siguiente observación.

### ROOT_OPERATOR

Para decisiones institucionales.

Añade:

- qué requiere atención;
- qué puede continuar automáticamente;
- qué requiere autorización;
- qué permanece bloqueado y por qué;
- qué retorno deberá observarse después de actuar.

### PUBLIC_ESSAY

Para Medium, libros y comunicación pública.

Puede reorganizar la secuencia para producir comprensión narrativa, pero debe conservar las mismas fronteras epistémicas.

### TECHNICAL_AUDIT

Sólo por petición explícita o cuando el destinatario necesita reproducibilidad técnica.

Puede incluir:

- event IDs;
- hashes;
- contratos;
- nombres de rutas;
- versiones;
- archivos;
- estados internos.

La existencia de este modo es precisamente lo que permite mantener limpia la comunicación ordinaria.

## 8. Relación con las superficies SFI

FIELD preserva la aparición antes del juicio. Su comunicación debe decir qué apareció y con qué procedencia.

STUDIO analiza o transforma un objeto. Su comunicación debe decir qué se hizo, qué cambió y qué requiere verificación posterior.

WORLD FIELD aporta contexto externo. Su comunicación debe mostrar fuente, fecha, alcance y límite, sin atribuir causalidad local automáticamente.

OBSERVATORY publica lecturas agregadas. Su comunicación debe mostrar mediaciones, procedencia y límites suficientes para que una visualización no parezca una ventana transparente sobre la realidad.

ROOT gobierna. Su comunicación debe priorizar estado, causa operativa, decisión requerida y siguiente evento esperado.

El COGNITIVE RUNTIME interpreta. Sus agentes pueden usar estructuras complejas internamente, pero su salida hacia una persona se somete a este protocolo.

## 9. Patrón de caso de uso

SFI es útil cuando existe una distancia entre lo que el sistema dice que ocurre y lo que sus rastros permiten observar.

Ejemplos:

- una mesa de ayuda cuyos timestamps no permiten confiar todavía en el SLA declarado;
- una institución que reporta cumplimiento mientras la latencia correctiva aumenta;
- una decisión cuya justificación se dispersó entre correos, archivos, reuniones y eventos;
- un sistema de IA cuya salida debe distinguirse de la evidencia que la alimentó;
- una señal cultural que persiste a través de distintos soportes;
- un proceso con recurrencia donde todavía no se sabe si existe demanda legítima, defecto repetido o mala clasificación;
- una intervención que debe registrarse antes de conocer su resultado;
- una hipótesis que necesita sobrevivir el tiempo suficiente para ser contradicha.

La comunicación no describe el software que hace esto. Describe la relación observable que SFI consiguió conservar.

## 10. Forma de cierre

Una salida SFI debe terminar en uno de estos estados humanos:

- «Esto está observado y puede sostenerse con la evidencia disponible.»
- «Esto es una derivación reproducible a partir de lo observado.»
- «Esto es una interpretación; existe al menos una explicación rival.»
- «La evidencia externa corrobora o contradice parcialmente este punto, pero no reemplaza la evidencia del caso.»
- «Esto todavía no puede saberse con el material disponible.»
- «La siguiente observación capaz de reducir la incertidumbre es…»
- «Existe una acción justificable, pero su resultado todavía no ha ocurrido y deberá volver como RETURN.»

## 11. Regla final

La precisión técnica se conserva en la traza.

La precisión conceptual se conserva en la explicación.

Ninguna persona debe recibir un código interno cuando SFI puede explicar qué significa ese código en una frase estable y verificable.
