const fs = require('fs');
const path = require('path');

// Ruta a la carpeta de migraciones
const migrationsDir = path.join(__dirname, 'src', 'lib', 'supabase', 'migrations');

// Verificar que la carpeta existe
if (!fs.existsSync(migrationsDir)) {
  console.error(`❌ La carpeta no existe: ${migrationsDir}`);
  process.exit(1);
}

// Leer todos los archivos .sql
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Orden alfabético

if (files.length === 0) {
  console.log('⚠️ No se encontraron archivos .sql en la carpeta.');
  process.exit(0);
}

// Variable para acumular todo el contenido
let output = '';
const separator = '='.repeat(80);

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  output += `\n${separator}\n`;
  output += `📄 ${file}\n`;
  output += `${separator}\n`;
  output += content;
  output += `\n${separator}\n`;
}

// Mostrar en consola
console.log(output);

// Opcional: guardar en un archivo .txt
const outputFile = 'all_migrations.txt';
fs.writeFileSync(outputFile, output, 'utf8');
console.log(`\n✅ Todos los archivos SQL han sido extraídos a: ${outputFile}`);