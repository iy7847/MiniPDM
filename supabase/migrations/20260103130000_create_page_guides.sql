-- Create page_guides table
create table if not exists page_guides (
  id uuid default gen_random_uuid() primary key,
  page_key text not null unique,
  content text default '',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table page_guides enable row level security;

-- Create policies (Allow read for everyone, insert/update for authenticated users)
DROP POLICY IF EXISTS "Allow public read access" ON page_guides;
CREATE POLICY "Allow public read access" on page_guides for select using (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON page_guides;
CREATE POLICY "Allow authenticated insert" on page_guides for insert with check (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update" ON page_guides;
CREATE POLICY "Allow authenticated update" on page_guides for update using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete" ON page_guides;
CREATE POLICY "Allow authenticated delete" on page_guides for delete using (auth.role() = 'authenticated');

-- Initial seed data
insert into page_guides (page_key, content) values
('dashboard', '# 대시보드 사용 가이드\n\n대시보드에서는 전체적인 업무 현황을 한눈에 파악할 수 있습니다.\n\n### 주요 기능\n- **견적/수주 현황**: 진행 중인 건수를 확인합니다.\n- **매출 요약**: 이달의 매출을 확인합니다.'),
('estimates', '# 견적 관리 가이드\n\n견적서를 작성하고 관리하는 페이지입니다.\n\n### 사용 방법\n1. **새 견적 작성**: 우측 상단 버튼을 클릭하세요.\n2. **상태 변경**: 작성 중 > 제출 > 수주 단계로 관리하세요.'),
('orders', '# 수주/발주 관리 가이드\n\n확정된 주문을 관리하고 발주서를 발행합니다.\n\n### 주요 기능\n- **PDF 분할**: 발주서 PDF를 도면별로 나눕니다.\n- **마스킹**: 업체 전달용 도면에서 가격 정보를 가립니다.')
on conflict (page_key) do nothing;
