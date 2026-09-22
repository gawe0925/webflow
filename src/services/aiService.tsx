import { PatientTask, PaymentRecord } from '../types';

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

        // 打後端 Proxy API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userQuery,
                simplifiedTasks,
                simplifiedPayments
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // 模式 B (結構化 JSON 分析模式) 需要 parse 回 JSON 物件
        if (!userQuery && typeof data.result === 'string') {
            try {
                return JSON.parse(data.result);
            } catch {
                return data.result;
            }
        }

        return data.result || null;
    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        throw error;
    }
};