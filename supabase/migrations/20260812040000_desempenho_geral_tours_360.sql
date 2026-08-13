-- Visão consolidada do desempenho comercial de todos os passeios 360°.

create or replace function public.get_virtual_tours_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with event_totals as (
    select
      event.tour_id,
      count(*) filter (where event.event_type = 'tour_view') as total_views,
      count(*) filter (
        where event.event_type = 'tour_view'
          and event.created_at >= now() - interval '30 days'
      ) as views_last_30_days,
      count(*) filter (
        where event.event_type = 'tour_view'
          and event.created_at >= now() - interval '7 days'
      ) as views_last_7_days,
      count(*) filter (where event.event_type = 'whatsapp_click') as whatsapp_clicks,
      count(*) filter (
        where event.event_type = 'tour_view'
          and event.is_embedded = true
      ) as embedded_views
    from public.virtual_tour_analytics_events event
    group by event.tour_id
  ),
  tour_rows as (
    select
      tour.id,
      tour.title,
      tour.slug,
      tour.status,
      tour.brand_name,
      coalesce(client.name, tour.contact_name, tour.brand_name, 'Cliente não vinculado') as client_name,
      coalesce(totals.total_views, 0) as total_views,
      coalesce(totals.views_last_30_days, 0) as views_last_30_days,
      coalesce(totals.views_last_7_days, 0) as views_last_7_days,
      coalesce(totals.whatsapp_clicks, 0) as whatsapp_clicks,
      coalesce(totals.embedded_views, 0) as embedded_views
    from public.virtual_tours tour
    left join event_totals totals
      on totals.tour_id = tour.id
    left join public.virtual_tour_services service
      on service.tour_id = tour.id
    left join public.virtual_tour_clients client
      on client.id = service.client_id
  ),
  daily_counts as (
    select
      (event.created_at at time zone 'America/Sao_Paulo')::date as day,
      count(*) as views
    from public.virtual_tour_analytics_events event
    where event.event_type = 'tour_view'
      and event.created_at >= now() - interval '14 days'
    group by 1
  )
  select jsonb_build_object(
    'total_tours', (select count(*) from tour_rows),
    'published_tours', (
      select count(*)
      from tour_rows
      where status = 'published'
    ),
    'total_views', coalesce((select sum(total_views) from tour_rows), 0),
    'views_last_30_days', coalesce((select sum(views_last_30_days) from tour_rows), 0),
    'views_last_7_days', coalesce((select sum(views_last_7_days) from tour_rows), 0),
    'whatsapp_clicks', coalesce((select sum(whatsapp_clicks) from tour_rows), 0),
    'embedded_views', coalesce((select sum(embedded_views) from tour_rows), 0),
    'tour_ranking', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tour_id', ranking.id,
          'title', ranking.title,
          'slug', ranking.slug,
          'status', ranking.status,
          'brand_name', ranking.brand_name,
          'client_name', ranking.client_name,
          'total_views', ranking.total_views,
          'views_last_30_days', ranking.views_last_30_days,
          'views_last_7_days', ranking.views_last_7_days,
          'whatsapp_clicks', ranking.whatsapp_clicks,
          'embedded_views', ranking.embedded_views
        )
        order by ranking.total_views desc, ranking.title asc
      )
      from tour_rows ranking
    ), '[]'::jsonb),
    'daily_views', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', days.day,
          'views', coalesce(counts.views, 0)
        )
        order by days.day asc
      )
      from generate_series(
        (current_date - 13)::timestamp,
        current_date::timestamp,
        interval '1 day'
      ) as days(day)
      left join daily_counts counts
        on counts.day = days.day::date
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_virtual_tours_overview()
  from public, anon, authenticated;

grant execute on function public.get_virtual_tours_overview()
  to service_role;

comment on function public.get_virtual_tours_overview() is
  'Resumo administrativo consolidado do desempenho de todos os passeios 360°.';
