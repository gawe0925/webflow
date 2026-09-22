import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userQuery, simplifiedTasks, simplifiedPayments } = req.body;
        
        // 優先讀取 GEMINI_API_KEY，若無則降級讀取 VITE_GEMINI_API_KEY
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            console.error('API Key Missing!');
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-3.6-flash';
        const model = genAI.getGenerativeModel({ model: modelName });

        // Mode A: Interactive Assistant Query Mode
        if (userQuery) {
            const prompt = `
You are a professional AI Assistant for an Australian retail pharmacy dispensary system.
Here is the real-time operational data from the system:

[Kanban Tasks Data JSON]:
${JSON.stringify(simplifiedTasks)}

[Front Till Payment Records JSON]:
${JSON.stringify(simplifiedPayments)}

User Query: "${userQuery}"

Instructions:
1. Answer the user's query in clear, professional English.
2. Use standard Australian pharmacy terminology (e.g., Webster-pak, Script, Account Payment, Front Till).
3. If no matching data or information is found, explicitly inform the user.
`;

            const result = await model.generateContent(prompt);
            return res.status(200).json({ result: result.response.text() });
        }

        // Mode B: Default Full Operational Analysis Mode
        const prompt = `
You are a senior dispensary operations analyst for an Australian pharmacy.
Please analyze the following live Kanban task data and Front Till payment records:

[Kanban Tasks Data JSON]:
${JSON.stringify(simplifiedTasks)}

[Payment Records Data JSON]:
${JSON.stringify(simplifiedPayments)}

Identify:
1. Operational anomalies or urgent action items.
2. Brief overall operational status.

Please return the analysis strictly in JSON format with "summary" and "alerts" fields.
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });

        return res.status(200).json({ result: result.response.text() });

    } catch (error: any) {
        console.error('Gemini Proxy Error:', error?.message || error);
        return res.status(500).json({ error: error?.message || 'Failed to fetch response from Gemini API' });
    }
}