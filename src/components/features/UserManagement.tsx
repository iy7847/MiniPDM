import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useProfile, UserProfile } from '../../hooks/useProfile';
import { Button } from '../common/ui/Button';
import { Card } from '../common/ui/Card';

export function UserManagement() {
    const { profile } = useProfile();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    const PERMISSIONS_LIST = [
        { key: 'can_create_estimate', label: '견적서 작성' },
        { key: 'can_delete_estimate', label: '견적서 삭제' },
        { key: 'can_view_margins', label: '단가/마진율 조회' },
        { key: 'can_manage_settings', label: '자재/설정 관리' },
    ];

    useEffect(() => {
        if (profile?.role === 'admin' && profile.company_id) {
            fetchUsers();
        }
    }, [profile]);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', profile?.company_id)
            .neq('id', profile?.id); // Exclude self if needed, or include

        if (error) {
            console.error('Error fetching users:', error);
            alert('사용자 목록을 불러오지 못했습니다.');
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    const handlePermissionChange = (permissionKey: string, checked: boolean) => {
        if (!editingUser) return;
        const currentPermissions = editingUser.permissions || {};
        setEditingUser({
            ...editingUser,
            permissions: {
                ...currentPermissions,
                [permissionKey]: checked
            }
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: editingUser.permissions })
            .eq('id', editingUser.id);

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            alert('권한이 저장되었습니다.');
            setEditingUser(null);
            fetchUsers();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800">사용자 권한 관리</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User List */}
                <Card>
                    <h4 className="font-bold mb-4 text-slate-700">직원 목록</h4>
                    {loading && <p className="text-sm text-slate-400">로딩 중...</p>}
                    <ul className="space-y-2">
                        {users.map(user => (
                            <li
                                key={user.id}
                                onClick={() => setEditingUser(user)}
                                className={`p-3 rounded-lg cursor-pointer border transition-colors ${editingUser?.id === user.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}
                            >
                                <div className="font-bold text-slate-800">{user.name || user.email}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Permission Editor */}
                {editingUser && (
                    <Card>
                        <h4 className="font-bold mb-4 text-slate-700">
                            권한 설정: <span className="text-indigo-600">{editingUser.name}</span>
                        </h4>
                        <div className="space-y-3">
                            {PERMISSIONS_LIST.map(perm => (
                                <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                                    <input
                                        type="checkbox"
                                        checked={editingUser.permissions?.[perm.key] || false}
                                        onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                                        className="w-5 h-5 text-indigo-600 rounded"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setEditingUser(null)}>취소</Button>
                            <Button variant="primary" onClick={handleSave}>저장</Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
