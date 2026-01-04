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
                        email: user.email // Profile table might not have email, so merging from auth
                    });
                }
            } catch (err: any) {
                console.error('Error fetching profile:', err);
                if (mounted) setError(err);
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
