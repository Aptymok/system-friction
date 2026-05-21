# apps/demo

Entorno demostrativo con fixtures declarados.

Responsabilidad declarada:
- renderizar experiencias demostrativas con datos marcados como fixture;
- permitir pruebas visuales sin tocar datos reales;
- consumir mocks desde `packages/testing`.

Limites:
- no conecta fuentes externas;
- no usa datos vivos;
- no escribe en base de datos;
- todo dato mostrado debe declarar `sourceState: "simulated"` o `sourceState: "fixture"`.

