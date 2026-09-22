import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    query
} from 'firebase/firestore';
import { StaffMember, StaffRole } from '../types/auth';

interface AuthContextType {
    firebaseUser: User | null;
    isFirebaseLoading: boolean;
    currentStaff: StaffMember | null;
    staffList: StaffMember[];
    loginFirebase: (email: string, pass: string) => Promise<void>;
    logoutFirebase: () => Promise<void>;
    loginStaff: (staffCode: string, pin: string) => Promise<boolean>;
    logoutStaff: () => void;
    createStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<void>;
    toggleStaffStatus: (staffId: string, currentStatus: boolean) => Promise<void>;
    hasRole: (allowedRoles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 定義 localStorage 的 Key
const AUTH_STORAGE_KEY = 'pharmacy_current_staff';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
    
    // 初始化時從 localStorage 讀取登入中的 Staff，解決重整被登出的問題
    const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(() => {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved auth from localStorage', e);
            }
        }
        return null;
    });

    const [staffList, setStaffList] = useState<StaffMember[]>([]);

    const auth = getAuth();
    const db = getFirestore();

    // 當 currentStaff 改變時，同步寫入或清除 localStorage
    useEffect(() => {
        if (currentStaff) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentStaff));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }, [currentStaff]);

    // 監聽 Firebase 第一道驗證狀態
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            setIsFirebaseLoading(false);

            if (user) {
                // 第一道通過後，載入該藥局的 Staff 清單
                fetchStaffMembers();
            } else {
                // 第一道登出時，自動清空第二道狀態與本地儲存
                setCurrentStaff(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
                setStaffList([]);
            }
        });

        return () => unsubscribe();
    }, [auth]);

    // 從 Firestore 讀取所有活躍員工
    const fetchStaffMembers = async () => {
        try {
            const q = query(collection(db, 'staff_members'));
            const querySnapshot = await getDocs(q);
            const members: StaffMember[] = [];
            querySnapshot.forEach((docSnap) => {
                members.push({ id: docSnap.id, ...docSnap.data() } as StaffMember);
            });
            setStaffList(members);
        } catch (err) {
            console.error('Failed to fetch staff members:', err);
        }
    };

    // 第一道：Firebase 帳號密碼登入
    const loginFirebase = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    // 第一道登出
    const logoutFirebase = async () => {
        await firebaseSignOut(auth);
        setCurrentStaff(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    // 第二道：Z Dispense 風格之 Staff 代號 + PIN 登入
    const loginStaff = async (staffCode: string, pin: string): Promise<boolean> => {
        const matchedStaff = staffList.find(
            (s) =>
                s.active &&
                s.staffCode.toLowerCase() === staffCode.trim().toLowerCase() &&
                String(s.pin ?? '').trim() === pin.trim()
        );

        if (matchedStaff) {
            setCurrentStaff(matchedStaff);
            return true;
        }
        return false;
    };

    // 第二道登出 / 切換使用者
    const logoutStaff = () => {
        console.log("logout");
        setCurrentStaff(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        console.log("Cleared currentStaff and localStorage");
    };

    // 新增 Staff (僅 Admin 可調用)
    const createStaff = async (staffData: Omit<StaffMember, 'id'>) => {
        const docRef = await addDoc(collection(db, 'staff_members'), {
            ...staffData,
            createdAt: new Date().toISOString(),
        });
        const newStaff = { ...staffData, id: docRef.id };
        setStaffList((prev) => [...prev, newStaff]);
    };

    // 開啟 / 停用 Staff
    const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
        const docRef = doc(db, 'staff_members', staffId);
        await updateDoc(docRef, { active: !currentStatus });
        setStaffList((prev) =>
            prev.map((s) => (s.id === staffId ? { ...s, active: !currentStatus } : s))
        );
    };

    // 權限檢查輔助函式
    const hasRole = (allowedRoles: StaffRole[]): boolean => {
        if (!currentStaff) return false;
        return allowedRoles.includes(currentStaff.role);
    };

    return (
        <AuthContext.Provider
            value={{
                firebaseUser,
                isFirebaseLoading,
                currentStaff,
                staffList,
                loginFirebase,
                logoutFirebase,
                loginStaff,
                logoutStaff,
                createStaff,
                toggleStaffStatus,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};