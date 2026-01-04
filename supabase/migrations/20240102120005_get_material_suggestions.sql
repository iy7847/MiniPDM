-- Function to get distinct material name suggestions from historical estimate items
create or replace function get_material_suggestions(search_term text)
returns table (material_name text)
language sql
security definer
as $$
  select distinct original_material_name
  from estimate_items
  where original_material_name is not null
    and original_material_name ilike '%' || search_term || '%'
  order by original_material_name
  limit 10;
$$;
