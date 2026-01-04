import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export interface GuideContent {
    id: string;
    page_key: string;
    content: string;
    updated_at: string;
}

export function useGuide(pageKey: string) {
    const [guide, setGuide] = useState<GuideContent | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pageKey) return;

        const fetchGuide = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('page_guides')
                    .select('*')
                    .eq('page_key', pageKey)
                    .eq('page_key', pageKey)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching guide:', error);
                    setError(error.message);
                } else {
                    // data can be null if no row found, which is fine
                    setGuide(data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchGuide();
    }, [pageKey]);

    const updateGuide = async (content: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('page_guides')
                .upsert({ page_key: pageKey, content }, { onConflict: 'page_key' })
                .select()
                .single();

            if (error) throw error;
            setGuide(data);
            return true;
        } catch (err: any) {
            console.error('Error updating guide:', err);
            alert('가이드 저장 실패: ' + err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { guide, loading, error, updateGuide };
}
