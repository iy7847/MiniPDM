-- Create shipments table
create table if not exists public.shipments (
    id uuid not null default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    order_id uuid not null references public.orders(id) on delete restrict,
    shipment_no text not null,
    status text not null default 'pending', -- pending, shipped, delivered, canceled
    courier text,
    tracking_no text,
    recipient_name text,
    recipient_contact text,
    recipient_address text,
    memo text,
    shipped_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    created_by uuid references auth.users(id),
    updated_at timestamp with time zone,

    constraint shipments_pkey primary key (id)
);

-- Create shipment_items table
create table if not exists public.shipment_items (
    id uuid not null default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    shipment_id uuid not null references public.shipments(id) on delete cascade,
    order_item_id uuid not null references public.order_items(id) on delete restrict,
    quantity numeric not null,
    box_no integer,
    note text,
    created_at timestamp with time zone not null default now(),

    constraint shipment_items_pkey primary key (id)
);

-- Add shipping_status to orders if not exists
alter table public.orders 
add column if not exists shipping_status text default 'unshipped';

-- Enable Row Level Security
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;

-- Create Policies for shipments (using company_id from profiles of auth user)
create policy "Enable read access for users in the same company"
on public.shipments for select
using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable insert access for users in the same company"
on public.shipments for insert
with check (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable update access for users in the same company"
on public.shipments for update
using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable delete access for interactions"
on public.shipments for delete
using (company_id = (select company_id from public.profiles where id = auth.uid()));

-- Create Policies for shipment_items
create policy "Enable read access for users in the same company"
on public.shipment_items for select
using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable insert access for users in the same company"
on public.shipment_items for insert
with check (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable update access for users in the same company"
on public.shipment_items for update
using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "Enable delete access for interactions"
on public.shipment_items for delete
using (company_id = (select company_id from public.profiles where id = auth.uid()));

-- Add indexes for performance
create index if not exists idx_shipments_company_id on public.shipments(company_id);
create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_shipment_items_shipment_id on public.shipment_items(shipment_id);
create index if not exists idx_shipment_items_order_item_id on public.shipment_items(order_item_id);
