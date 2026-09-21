import { UserRole } from '../types';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const roles: { value: UserRole; label: string; color: string }[] = [
    { value: 'staff', label: 'General Counter Staff', color: 'bg-blue-500' },
    { value: 'pharmacist', label: 'Pharmacist', color: 'bg-green-500' },
    { value: 'manager', label: 'Manager', color: 'bg-purple-500' }
  ];

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${roles.find(r => r.value === currentRole)?.color || 'bg-gray-500'}`} />
        <span className="font-semibold text-gray-700">Current Role:</span>
        <span className="text-gray-900">{roles.find(r => r.value === currentRole)?.label}</span>
      </div>
      <div className="h-6 w-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <label htmlFor="role-select" className="text-sm text-gray-600">Switch Role:</label>
        <select
          id="role-select"
          value={currentRole}
          onChange={(e) => onRoleChange(e.target.value as UserRole)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {roles.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
