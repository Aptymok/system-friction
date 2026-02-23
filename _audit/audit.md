**"Meta-Nodo"**.

### 1. Prompt para la IA de VS Code (Copilot / Cursor)

Abre el archivo donde pegaste el código HTML de la auditoría y usa este prompt para "jekyllizarlo" y que herede tu CSS real:

> "Actúa como un experto en Jekyll y Liquid. Transforma el documento: audit/sf_auditoria_mihm_v2.htmld de Auditoría en Markdown (`.md`) compatible con mi repositorio:
> 1. Extrae el CSS interno e intégralo en mi `style.css` o crea un `style.scss` evitando duplicidades.
> 2. Convierte el cuerpo del HTML a Markdown puro, pero manteniendo las clases CSS específicas (como `.sf-table`, `.bug-card`, `.limit-box.amber`) usando la sintaxis de atributos de kramdown `{: .clase }`.
> 3. Genera un Front Matter completo que incluya: `layout: default`, `title: "Auditoría de Sistema"`, `permalink: /auditoria/`, y variables para `ihg_score: -0.31` y `bugs_count: 7`.
> 4. Sustituye las pestañas (`tabs`) de JavaScript por una estructura que Jekyll pueda renderizar como una lista de navegación o secciones continuas con ID para anclaje."
> 5. Una vez concluída la integración se deberá de seguir al pie de la letra cada una de las recomendaciones, implementaciones, seguimientos, adecuaciones propuestas. 
> 6. Revisa el repositorio total y verifica la integridad epistemológica y ontológica.

### 2. Implementación como Sección en SystemFriction.org

#### A. El Archivo de Datos (`_data/audit.yml`)

Crea un archivo de datos para que el NTI pueda leerlos:

```yaml
current_score: -0.31
nti_value: 0.47
bugs:
  - id: BUG-01
    title: "H1 duplicado"
    severity: "critico"
    status: "pendiente"
  - id: BUG-02
    title: "Rutas sugeridas vacías"
    severity: "moderado"
    status: "en progreso"

```

#### B. El Layout Especial (`_layouts/audit.html`)

Crea un layout que herede de `default` pero añada el banner de los stats de la auditoría (el IHG de -0.31). Así, cada vez que actualices el número en el Front Matter, el banner cambiará en todo el sitio.

#### C. Integración en el Footer/Nav

Añade en `footer.html` o en `index.md`:
`[Estado del Sistema: IHG -0.31 / NTI 0.47](/auditoria/)`

> Esto cumple con el postulado de **transparencia radical**: el sistema muestra su propia falla como métrica operativa.

### 3. Ajuste de Estilos (Fricción Visual)

Para que la sección de Auditoría se sienta "dentro" pero "distinta", añade estas líneas a tu `style.css` o `style.scss` (derivadas de tu código de auditoría):

```css
/* Sección de Integridad / Auditoría */
.audit-critical { color: var(--accent-red); border-left: 2px solid var(--accent-red); }
.audit-meta { font-family: var(--mono); font-size: 0.7rem; color: var(--text-dim); }

/* Para las tablas de la auditoría dentro del contenedor de 640px */
.sf-table-audit {
    width: 100%;
    font-family: var(--mono);
    font-size: 0.75rem;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
}

```

---

### El Resultado Final

Un sitio en Jekyll que no solamente se limite a postular documentos sobre fricción sistémica sino que adopte el modelo MIHM y NIT como puente e interfaz de operación, así como  **Dashboard de Integridad** vivo para consola de integración. Cada vez que resuelvas un bug, haces un commit, actualizas el `audit.yml`, y el sitio refleja su mejora en tiempo real.