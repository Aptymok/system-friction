export class MediaMIHM {
  static async processFile(file: File): Promise<{ type: string; core_attainment: number }> {
    // Lógica para determinar si el archivo tiene el "Núcleo de 6 variables"
    const isAudio = file.type.startsWith('audio/');
    return {
      type: file.type,
      core_attainment: isAudio ? 0.85 : 0.40 // El audio es el sensor primario
    };
  }
}