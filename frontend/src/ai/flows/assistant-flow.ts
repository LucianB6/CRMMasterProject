export async function askAssistant(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    return "Spune-mi cu ce te pot ajuta.";
  }

  return "Asistentul AI este inca in configurare. Voi raspunde aici dupa ce conectam providerul.";
}
