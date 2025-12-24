-- 4.3 Add Country Fields to Clients Table
-- 기존 clients 테이블에 해외 여부(is_foreign)와 국가(country) 컬럼을 추가합니다.

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_foreign BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'KR';

-- (선택 사항) 기존 데이터 마이그레이션
-- 기존 데이터 중 사업자번호 형식이 10자리가 아닌 경우 해외 기업으로 추정하여 업데이트
UPDATE public.clients
SET is_foreign = true, country = 'US' -- 기본값 미국(US) 등으로 설정 또는 직접 수정 필요
WHERE length(regexp_replace(biz_num, '[^0-9]', '', 'g')) != 10;