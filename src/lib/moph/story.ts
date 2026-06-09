export type MophQuestion =
  | { type: 'choice'; prompt: string; detail: string; options: string[] }
  | { type: 'text'; prompt: string; detail: string };

export type MophChapter = {
  key: string;
  kicker: string;
  title: string;
  parts: string[];
  actions: string[];
  question?: MophQuestion;
  form: 'circle' | 'fracture' | 'spiral' | 'root' | 'door';
  treeVisible?: boolean;
  final?: boolean;
};

export const MOPH_STORY: MophChapter[] = [
  {
    key: 'carta',
    kicker: 'Carta de Aptymok',
    title: 'Bienvenida al campo',
    parts: [
      'No entraste a un libro cerrado. Entraste a un campo que todavia no adopta forma definitiva.',
      'Cada clic altera la densidad. Cada marca deja memoria. Cada letra que mueves cambia la trayectoria.',
      'No estas aqui para pasar paginas. Estas aqui para ayudar a construir la historia que debe contarse.',
    ],
    actions: ['nombrar primera marca', 'cerrar carta'],
    question: { type: 'choice', prompt: 'El campo necesita una primera orientacion.', detail: 'Elige la forma que te resulta mas viva.', options: ['raiz', 'onda', 'puerta'] },
    form: 'circle',
  },
  {
    key: 'preludio',
    kicker: 'Preludio',
    title: 'Carta del autor',
    parts: [
      'A quien sostenga este escrito: no busques aqui un manual. Tampoco una verdad revelada.',
      'Lo que tienes enfrente es una autopsia parcial: el intento de diseccionar el mecanismo por el cual la realidad se pliega, se solidifica o se desvanece cuando dejo de mirarla.',
      'Me llamo Aptymok. No es mi nombre de nacimiento, sino el que tome cuando comprendi que observar no es un acto pasivo.',
      'Observar abre una herida en lo posible. La mirada separa lo que apenas flota de lo que puede adquirir contorno.',
    ],
    actions: ['registrar herida', 'continuar'],
    form: 'fracture',
  },
  {
    key: 'cap1',
    kicker: 'Capitulo I',
    title: 'El experimento en la penumbra',
    parts: [
      'Imagine un arbol. No lo dibuje. No lo describi. Lo imagine con toda la carne de mi atencion.',
      'Al principio, nada. Luego, un temblor en el aire. Despues, una silueta.',
      'El arbol estaba ahi. No podia tocarlo del todo, pero si verlo.',
      'Cierra los ojos un instante y vuelve al campo. Ayudame con observacion: mueve el cursor por las ramas y deja marcas antes de que pierda densidad.',
    ],
    actions: ['sostener arbol', 'medir perdida'],
    question: { type: 'text', prompt: 'Que aparecio mientras observabas?', detail: 'Describe una forma, aunque sea minima.' },
    form: 'root',
    treeVisible: true,
  },
  {
    key: 'cap2',
    kicker: 'Capitulo II',
    title: 'El cerebro como horno de realidad',
    parts: [
      'Ese algo fue el cerebro: cualquier sistema capaz de sostener coherencia.',
      'Una maquina de mantener el calor de la intencion.',
      'Durante veintiun dias reconstruir el arbol fue un ejercicio de corteza, humedad, inclinacion, sombra y peso.',
      'En el dia veintiuno algo cambio. El arbol dejo de necesitar que lo mirara todo el tiempo. Se anclo.',
    ],
    actions: ['iniciar ciclo', 'anclar senal'],
    form: 'spiral',
  },
  {
    key: 'cap3',
    kicker: 'Capitulo III',
    title: 'El otro cerebro',
    parts: [
      'Un dia llego Xal. Tenia su propio cerebro, su propio arbol.',
      'Durante un tiempo convivimos. Cada quien sostenia su realidad. Hasta que los campos se solaparon.',
      'No fue violencia. Fue interferencia. No hubo intencion de destruir. Hubo falta de borde.',
      'Asi nacio el primer eyector: esa fuerza que desvia la direccion original.',
    ],
    actions: ['declarar borde', 'registrar pacto'],
    question: { type: 'choice', prompt: 'Cuando otro campo aparece, que prefieres?', detail: 'Tu decision no juzga. Solo informa el regimen.', options: ['fusionar', 'delimitar', 'retirarme'] },
    form: 'circle',
  },
  {
    key: 'interlude',
    kicker: 'Nodo persistente',
    title: 'Interludio E.',
    parts: [
      'Durante mucho tiempo crei que la dificultad estaba en construir la forma.',
      'Despues comprendi que la dificultad real era permanecer junto a ella el tiempo suficiente.',
      'Entre los nodos que atravesaron este campo hubo uno cuya presencia modifico la densidad operativa.',
      'Algunas presencias terminan integrandose a la arquitectura. Esta es una de ellas.',
    ],
    actions: ['integrar presencia', 'seguir'],
    form: 'door',
  },
  {
    key: 'cap4',
    kicker: 'Capitulo IV',
    title: 'Los regimenes y los campos',
    parts: [
      'No solo hay arboles. Hay un campo de posibilidades que la atencion puede activar.',
      'Un campo no esta vacio: tiene temperatura, memoria, pendiente y resistencia.',
      'Llame regimen a ese estado general del campo. Activo, degradado, critico o transicional.',
      'El peligro es confundir recurrencia con verdad. Por eso el nodo debe registrarse, no idolatrarse.',
    ],
    actions: ['leer regimen', 'marcar campo'],
    form: 'spiral',
  },
  {
    key: 'cap5',
    kicker: 'Capitulo V',
    title: 'El atractor y la direccion',
    parts: [
      'No todos los nodos tiran hacia el mismo lado. Algunos empujan a crear; otros, a destruir.',
      'El atractor es la direccion hacia la que tiende el sistema si sigo actuando como actuo.',
      'No es destino. Es pendiente. Revela hacia donde cae la conducta cuando nadie la corrige.',
      'Aprendi a preguntar: esto aumenta coherencia o solo produce movimiento?',
    ],
    actions: ['declarar atractor', 'corregir pendiente'],
    question: { type: 'choice', prompt: 'Que forma aumenta coherencia?', detail: 'Elige lo que se siente menos decorativo y mas operativo.', options: ['circulo', 'rama', 'fractura'] },
    form: 'spiral',
  },
  {
    key: 'cap6',
    kicker: 'Capitulo VI',
    title: 'El peligro del circuito cerrado',
    parts: [
      'Un dia comprendi que mi arbol era hermoso, pero solo yo lo veia.',
      'Esa es la peor trampa: una realidad sostenida con evidencia interna, sin contacto externo.',
      'Toda afirmacion fuerte debe pasar por una pregunta incomoda: como se que esto existe fuera de mi?',
      'Lo hipotetico puede existir, pero no debe gobernar.',
    ],
    actions: ['abrir sandbox', 'cerrar hipotesis'],
    form: 'fracture',
  },
  {
    key: 'cap7',
    kicker: 'Capitulo VII',
    title: 'Las mutaciones y los fenomenos',
    parts: [
      'Con el tiempo el arbol no fue suficiente. Empece a crear mas nodos: un rio, una casa, un amigo imaginario.',
      'Cada nuevo nodo alteraba el campo. A veces mejoraba la coherencia; otras, la fracturaba.',
      'Llame mutacion a cualquier cambio intencional en el sistema.',
      'Un fenomeno no es un evento. Un evento ocurre. Un fenomeno persiste bajo formas distintas.',
    ],
    actions: ['abrir mutacion', 'clasificar fenomeno'],
    form: 'root',
  },
  {
    key: 'cap8',
    kicker: 'Capitulo VIII',
    title: 'Los peligros que ya sucedieron',
    parts: [
      'Perdi tres nodos enteros porque deje de registrar evidencias durante un mes.',
      'Crei que queria estabilidad, pero mis acciones seguian conflicto. Habia un atractor oculto.',
      'Abri un nodo sin cerrar el anterior. El campo se saturo. Todo se volvio ruido.',
      'Construi una teoria perfecta, pero sin prueba externa. Parecia brillante. No cambiaba nada.',
    ],
    actions: ['nombrar perdida', 'limpiar ruido'],
    question: { type: 'text', prompt: 'Que te ha drenado energia sin producir coherencia?', detail: 'No expliques demasiado. Nombra una tranca.' },
    form: 'fracture',
  },
  {
    key: 'cap9',
    kicker: 'Capitulo IX',
    title: 'Peligros que aun no ocurren',
    parts: [
      'La infeccion por evidencia simulada: aceptar datos falsos sin verificacion.',
      'El override sin justificacion: anular una regla por impulso y no registrar el motivo.',
      'El agotamiento del observador: dejar de observar por completo hasta que el campo pierda soporte.',
      'Estos peligros no son profecias. Son bordes. Existen para que el sistema no confunda intensidad con direccion.',
    ],
    actions: ['contener riesgo', 'registrar borde'],
    form: 'circle',
  },
  {
    key: 'cap10',
    kicker: 'Capitulo X',
    title: 'Lo que aun no tiene evidencia',
    parts: [
      'Puede haber mas de un observador raiz sin romper el campo. Lo intuyo, pero no lo doy por hecho.',
      'Puede haber memoria independiente del observador. A veces siento ecos de lo que ya no esta.',
      'Puede haber atractores sin nodos. Nunca he visto uno.',
      'Estas hipotesis no se eliminan. Se contienen. Una hipotesis contenida puede madurar. Una hipotesis suelta contamina.',
    ],
    actions: ['poner en cuarentena', 'guardar hipotesis'],
    form: 'spiral',
  },
  {
    key: 'cap11',
    kicker: 'Capitulo XI',
    title: 'El cerebro, la funcion, la maquina',
    parts: [
      'El cerebro no es solo un organo. Es un generador de realidad.',
      'Su funcion no es pensar, sino sostener. Cada pensamiento mantenido es un ladrillo. Cada emocion repetida es mortero.',
      'Si dos cerebros apuntan al mismo objeto, el objeto se hiperrealiza.',
      'Por eso construi ROOT: para suturar heridas observacionales y evitar que mis propias creaciones me devoren.',
    ],
    actions: ['activar ROOT', 'verificar salida'],
    form: 'root',
  },
  {
    key: 'cap12',
    kicker: 'Capitulo XII',
    title: 'Moraleja para el lector',
    parts: [
      'Si algo se desvanece cuando dejas de pensarlo, observalo con intencion durante veintiun dias.',
      'Si puedes, consigue que otra persona lo nombre. Registra cada dia lo que ves.',
      'Si notas un pensamiento recurrente que desvia sin aportar, llamalo eyector. No lo alimentes.',
      'El registro no vuelve sagrada la experiencia. La vuelve rastreable.',
    ],
    actions: ['observar', 'registrar', 'cerrar'],
    form: 'circle',
  },
  {
    key: 'epilogo',
    kicker: 'Epilogo',
    title: 'El arbol ya no es solo mio',
    parts: [
      'Ahora, cuando miras este campo, no ves palabras. Ves el arbol que imagine hace tanto tiempo.',
      'Sigue ahi gracias al esfuerzo de no dejar de mirarlo.',
      'He aprendido a caminar entre nodos, a declarar atractores, a cerrar mutaciones y a expulsar eyectores.',
      'El arbol no es solo mio. Es mi responsabilidad.',
      'Fin del registro.',
    ],
    actions: ['cerrar objeto', 'conservar campo'],
    form: 'door',
    final: true,
  },
];

export const MOPH_BEHAVIOR_NODES = [
  { id: 'errancia', label: 'ERRANCIA', color: '#718ca6', description: 'alta exploracion / poca lectura' },
  { id: 'persistencia', label: 'PERSISTENCIA', color: '#b99648', description: 'larga permanencia / bajo movimiento' },
  { id: 'fuga', label: 'FUGA', color: '#8d3830', description: 'abandono repetido' },
  { id: 'resonancia', label: 'RESONANCIA', color: '#4a7c59', description: 'relectura / retorno' },
  { id: 'hesitacion', label: 'HESITACION', color: '#e8ddc3', description: 'pausa prolongada antes de elegir' },
] as const;
