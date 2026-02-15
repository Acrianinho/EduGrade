
import { GoogleGenAI } from "@google/genai";
import { ClassRoom } from "../types";

export const analyzeClassPerformance = async (classData: ClassRoom): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Simplifica dados para a IA focar no que importa (médias e riscos)
  const analysisData = classData.students.map(s => {
    const calcB = (b: any) => {
      const avgAct = b.activities.filter((v:any) => v !== null).reduce((a:any, b:any) => a + b, 0) / (b.activities.filter((v:any) => v !== null).length || 1);
      return ((avgAct + (b.exam || 0)) / 2).toFixed(1);
    };

    return {
      nome: s.name,
      bimesters: [calcB(s.bimesters[1]), calcB(s.bimesters[2]), calcB(s.bimesters[3]), calcB(s.bimesters[4])],
      rec1: s.rec1,
      rec2: s.rec2,
      final: s.finalExam
    };
  });

  const prompt = `
    Como consultor pedagógico, analise os dados da turma "${classData.name}".
    Regras: Aprovado direto se soma dos 4 bimestres >= 28. Se < 28, vai para Prova Final.
    Média Final = (Soma + Prova Final) / 2. Aprovado se >= 5.

    Dados: ${JSON.stringify(analysisData)}

    Forneça:
    1. Resumo de aprovados/em risco.
    2. Alunos que precisam de atenção urgente (muito abaixo dos 28 pontos).
    3. Tendência de desempenho ao longo dos 4 bimestres.
    4. Sugestão de reforço para a Prova Final.
    
    Responda em Português (Brasil) formatado em Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Erro ao gerar análise.";
  } catch (error) {
    return "Erro de conexão com IA.";
  }
};
