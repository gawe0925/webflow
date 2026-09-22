import { GoogleGenAI, Type, Schema } from '@google/genai';
import { PatientTask, PaymentRecord } from '../types';

// Initialize Gemini API (using official SDK)
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Read model name from env, fallback to gemini-3.6-flash
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.6-flash';

// JSON Schema definition for full dispensary operational analysis
const analysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: 'One-sentence summary of overall dispensary operations and workflow bottlenecks'
        },
        alerts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    level: { type: Type.STRING, enum: ['warning', 'info', 'urgent'] },
                    message: { type: Type.STRING, description: 'Specific alert or action item description' },
                    affectedPatientCodes: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'List of affected patient codes'
                    }
                },
                required: ['level', 'message']
            }
        },
        metrics: {
            type: Type.OBJECT,
            properties: {
                unpaidAccountCount: { type: Type.NUMBER, description: 'Count of Account Payment patients in Collected status' },
                pendingPacksCount: { type: Type.NUMBER, description: 'Count of Webster-paks not yet completed' }
            }
        }
    },
    required: ['summary', 'alerts']
};

export const analyzeDispensaryData = async (
    tasks: PatientTask[],
    paymentRecords: PaymentRecord[],
    userQuery?: string
) => {
    try {
        // Simplify dataset to optimize token usage
        const simplifiedTasks = tasks.map(t => ({
            patientCode: t.patientCode,
            status: t.currentStatus,
            isAccountPayment: t.isAccountPayment,
            hasWebsterPakFee: t.hasWebsterPakFee,
            hasInvoice: t.hasInvoice,
            hasScriptReminder: t.hasScriptReminder,
            packsCount: t.packs?.length || 0,
            completedPacksCount: t.packs?.filter(p => p.isCompleted).length || 0,
            lastUpdated: t.lastUpdatedTime,
            rejectReason: t.rejectReason || null
        }));

        const simplifiedPayments = paymentRecords.map(p => ({
            patientCode: p.patientCode,
            status: p.paymentStatus,
            createdAt: p.createdAt
        }));

        // Mode A: Interactive Assistant Query Mode
        if (userQuery) {
            const prompt = `
You are a professional AI Copilot for an Australian retail pharmacy dispensary system.
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

            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt
            });

            return response.text || "I was unable to find specific details matching your question in the current dispensary data.";
        }

        // Mode B: Default Full Operational Analysis Mode (Returns Structured JSON)
        const prompt = `
You are a senior dispensary operations analyst for an Australian pharmacy.
Please analyze the following live Kanban task data and Front Till payment records:

[Kanban Tasks Data JSON]:
${JSON.stringify(simplifiedTasks)}

[Payment Records Data JSON]:
${JSON.stringify(simplifiedPayments)}

Identify:
1. Operational anomalies or urgent action items (e.g., patients stuck in TODO/Rejected, or patients marked 'Collected' with unconfirmed account payments).
2. Brief overall operational status.

Please return the analysis strictly adhering to the requested JSON schema.
`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: analysisSchema,
                temperature: 0.2
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        throw error;
    }
};