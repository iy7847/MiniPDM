-- 4.2 Seed Materials (Standard Library)
-- [주의] 이 쿼리는 '로그인한 사용자'가 등록한 것으로 처리하기 위해,
-- 실제 앱에서 회원가입 후 생성된 회사의 ID를 알아야 정확하게 들어갑니다.
-- 하지만 개발 단계의 편의를 위해, 현재 존재하는 모든 회사에 이 표준 자재를 넣어주는 스크립트입니다.

DO $$
DECLARE
    comp RECORD;
BEGIN
    -- companies 테이블에 있는 모든 회사에 대해 반복
    FOR comp IN SELECT id FROM public.companies LOOP
        
        -- 1. 스틸 (SS400 / S45C)
        INSERT INTO public.materials (company_id, category, name, code, density, unit_price, update_memo)
        VALUES 
        (comp.id, '스틸(Steel)', '일반철판 (SS400)', 'SS400', 7.85, 1200, '시스템 초기 세팅'),
        (comp.id, '스틸(Steel)', '탄소강 (S45C)', 'S45C', 7.85, 1400, '시스템 초기 세팅');

        -- 2. 스테인리스 (SUS304 / 316)
        INSERT INTO public.materials (company_id, category, name, code, density, unit_price, update_memo)
        VALUES 
        (comp.id, '스텐(SUS)', '스테인리스 304', 'SUS304', 7.93, 4500, '시스템 초기 세팅'),
        (comp.id, '스텐(SUS)', '스테인리스 316', 'SUS316', 7.98, 6500, '시스템 초기 세팅');

        -- 3. 알루미늄 (AL6061)
        INSERT INTO public.materials (company_id, category, name, code, density, unit_price, update_memo)
        VALUES 
        (comp.id, '알루미늄(AL)', '알루미늄 6061', 'AL6061', 2.70, 6000, '시스템 초기 세팅');

    END LOOP;
END $$;