-- CLEANUP AND DEDUPLICATE RESOURCES
-- 1. Update steps to point to the first occurrence of each URL
update public.steps
set resource_id = sub.min_id
from (
    select url, min(id) as min_id
    from public.resources
    group by url
) sub
join public.resources r on r.url = sub.url
where public.steps.resource_id = r.id;

-- 2. Update milestones to point to the first occurrence of each URL
update public.milestones
set resource_id = sub.min_id
from (
    select url, min(id) as min_id
    from public.resources
    group by url
) sub
join public.resources r on r.url = sub.url
where public.milestones.resource_id = r.id;

-- 3. Delete duplicates from resources table
delete from public.resources
where id not in (
    select min(id)
    from public.resources
    group by url
);

-- 4. Add unique constraint to url (if it doesn't exist)
do $$
begin
    if not exists (
        select 1 from pg_constraint 
        where conrelid = 'public.resources'::regclass 
        and conname = 'resources_url_key'
    ) then
        alter table public.resources add constraint resources_url_key unique (url);
    end if;
end $$;
