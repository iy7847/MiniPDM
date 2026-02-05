import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    company_id: string;
    role: string;
    avatar_url?: string;
    permissions?: {
        [key: string]: boolean;
    };
}

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (mounted) {
                    setProfile({
                        ...data,
                        email: user.email || '' // 프로필 테이블에 이메일이 없을 수 있으므로 auth에서 병합
                    });
                }
            } catch (err) { // 'any'를 특정 오류 유형으로 대체
                console.error('프로필 가져오기 오류:', err); // 영어 주석을 한국어로 번역
                if (mounted) setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.'));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchProfile();

        return () => {
            mounted = false;
        };
    }, []);

    return { profile, loading, error };
}
