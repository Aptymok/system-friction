# AMV Reading Export Save

`json_export` serializa estado visible y evidencia permitida mediante `POST /api/amv/export`. No escribe DB.

`save-reading` devuelve contrato safe/degraded mediante `POST /api/amv/save-reading`. Si no hay persistencia autorizada, responde `degraded_no_persistence` y no simula escritura.
