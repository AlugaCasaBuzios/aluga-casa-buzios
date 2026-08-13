-- Relatórios de desempenho dos passeios 360° com período personalizado.

create or replace function public.get_virtual_tour_analytics_period(
  p_tour_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      (p_start_date::timestamp at time zone 'America/Sao_Paulo') as start_at,
      ((p_end_date + 1)::timestamp at time zone 'America/Sao_Paulo') as end_at,
      ((p_start_date - (p_end_date - p_start_date + 1))::timestamp at time zone 'America/Sao_Paulo') as previous_start_at,
      (p_start_date::timestamp at time zone 'America/Sao_Paulo') as previous_end_at
  )
  select jsonb_build_object(
    'period_start', p_start_date,
    'period_end', p_end_date,
    'total_views', (
      select count(*)
      from public.virtual_tour_analytics_events event, bounds
      where event.tour_id = p_tour_id
        and event.event_type = 'tour_view'
        and event.created_at >= bounds.start_at
        and event.created_at < bounds.end_at
    ),
    'previous_period_views', (
      select count(*)
      from public.virtual_tour_analytics_events event, bounds
      where event.tour_id = p_tour_id
        and event.event_type = 'tour_view'
        and event.created_at >= bounds.previous_start_at
        and event.created_at < bounds.previous_end_at
    ),
    'whatsapp_clicks', (
      select count(*)
      from public.virtual_tour_analytics_events event, bounds
      where event.tour_id = p_tour_id
        and event.event_type = 'whatsapp_click'
        and event.created_at >= bounds.start_at
        and event.created_at < bounds.end_at
    ),
    'embedded_views', (
      select count(*)
      from public.virtual_tour_analytics_events event, bounds
      where event.tour_id = p_tour_id
        and event.event_type = 'tour_view'
        and event.is_embedded = true
        and event.created_at >= bounds.start_at
        and event.created_at < bounds.end_at
    ),
    'scene_ranking', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'scene_id', ranking.scene_id,
          'scene_name', ranking.scene_name,
          'views', ranking.views
        )
        order by ranking.views desc, ranking.scene_name asc
      )
      from (
        select
          scene.id as scene_id,
          scene.name as scene_name,
          count(event.id) as views
        from public.virtual_tour_scenes scene
        cross join bounds
        left join public.virtual_tour_analytics_events event
          on event.scene_id = scene.id
          and event.tour_id = p_tour_id
          and event.event_type = 'scene_view'
          and event.created_at >= bounds.start_at
          and event.created_at < bounds.end_at
        where scene.tour_id = p_tour_id
        group by scene.id, scene.name
      ) ranking
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
        p_start_date::timestamp,
        p_end_date::timestamp,
        interval '1 day'
      ) as days(day)
      left join (
        select
          (event.created_at at time zone 'America/Sao_Paulo')::date as day,
          count(*) as views
        from public.virtual_tour_analytics_events event, bounds
        where event.tour_id = p_tour_id
          and event.event_type = 'tour_view'
          and event.created_at >= bounds.start_at
          and event.created_at < bounds.end_at
        group by 1
      ) counts
        on counts.day = days.day::date
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_virtual_tour_analytics_period(uuid, date, date)
  from public, anon, authenticated;

grant execute on function public.get_virtual_tour_analytics_period(uuid, date, date)
  to service_role;

comment on function public.get_virtual_tour_analytics_period(uuid, date, date) is
  'Estatísticas administrativas de um passeio 360° dentro de um período selecionado.';
