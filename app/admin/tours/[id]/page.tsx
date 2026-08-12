import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

import VirtualTourSceneUploader from "@/components/virtual-tour/VirtualTourSceneUploader";

import VirtualTourSharePanel from "@/components/virtual-tour/VirtualTourSharePanel";

import VirtualTourHotspotEditor from "@/components/virtual-tour/VirtualTourHotspotEditor";

import VirtualTourSceneImageReplacer from "@/components/virtual-tour/VirtualTourSceneImageReplacer";

import VirtualTourLogoUploader from "@/components/virtual-tour/VirtualTourLogoUploader";

import {
  deleteVirtualTourLink,
  deleteVirtualTourScene,
  publishVirtualTour,
  saveVirtualTourLink,
  setStartScene,
  unpublishVirtualTour,
  updateVirtualTourScene,
  moveVirtualTourScene,
  removeVirtualTourLogo,
  setVirtualTourCover,
  updateVirtualTourBranding,
  updateVirtualTourAccess,
} from "../actions";

export const dynamic =
  "force-dynamic";

type TourDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    inicio?: string;
    excluido?: string;
    publicado?: string;
    rascunho?: string;
    erro?: string;
    conexao?: string;
    conexao_excluida?: string;
    ambiente_atualizado?: string;
    ordenado?: string;
    personalizacao?: string;
    capa?: string;
    logo_removido?: string;
    acesso?: string;
  }>;
};

type TourRecord = {
  id: string;
  property_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  brand_name: string | null;
  contact_name: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  cover_image_path: string | null;
  logo_path: string | null;
  primary_color: string | null;
  accent_color: string | null;
  white_label: boolean | null;
  access_mode: string;
  access_password_hash: string | null;
  access_expires_at: string | null;
};

type TourServiceRecord = {
  service_status: string;
};

type SceneRecord = {
  id: string;
  name: string;
  panorama_path: string;
  sort_order: number;
  is_start: boolean;
  created_at: string;
};

type SceneLinkRecord = {
  id: string;
  from_scene_id: string;
  to_scene_id: string;
  yaw_degrees: number | string;
  pitch_degrees: number | string;
  label: string | null;
};

function isValidUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatAccessExpiration(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone:
          "America/Sao_Paulo",
      }
    ).formatToParts(
      new Date(value)
    );

  const getPart =
    (type: string) =>
      parts.find(
        (part) =>
          part.type === type
      )?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
}

export default async function TourDetailPage({
  params,
  searchParams,
}: TourDetailPageProps) {
  const {
    id,
  } = await params;

  const {
    inicio,
    excluido,
    publicado,
    rascunho,
    erro,
    conexao,
    conexao_excluida,
    ambiente_atualizado,
    ordenado,
    personalizacao,
    capa,
    logo_removido,
    acesso,
  } = await searchParams;

  if (!isValidUuid(id)) {
    notFound();
  }

  const authenticationClient =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await authenticationClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const {
    data: isAdmin,
  } =
    await authenticationClient.rpc(
      "is_management_admin"
    );

  if (isAdmin !== true) {
    redirect("/admin");
  }

  const supabase =
    createSupabaseAdminClient();

  const [
    tourResult,
    scenesResult,
    serviceResult,
  ] = await Promise.all([
    supabase
      .from("virtual_tours")
      .select(`
        id,
        property_id,
        title,
        slug,
        description,
        status,
        brand_name,
        contact_name,
        contact_whatsapp,
        contact_phone,
        cover_image_path,
        logo_path,
        primary_color,
        accent_color,
        white_label,
        access_mode,
        access_password_hash,
        access_expires_at
      `)
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("virtual_tour_scenes")
      .select(`
        id,
        name,
        panorama_path,
        sort_order,
        is_start,
        created_at
      `)
      .eq("tour_id", id)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("virtual_tour_services")
      .select("service_status")
      .eq("tour_id", id)
      .maybeSingle(),
  ]);

  if (tourResult.error) {
    console.error(
      "Erro ao carregar passeio virtual:",
      tourResult.error
    );
  }

  if (!tourResult.data) {
    notFound();
  }

  const tour =
    tourResult.data as
      TourRecord;

  const scenes =
    (scenesResult.data ?? []) as
      SceneRecord[];

  const service =
    serviceResult.data as
      TourServiceRecord | null;

  const sceneIds =
    scenes.map(
      (scene) => scene.id
    );

  const linksResult =
    sceneIds.length > 0
      ? await supabase
          .from(
            "virtual_tour_links"
          )
          .select(`
            id,
            from_scene_id,
            to_scene_id,
            yaw_degrees,
            pitch_degrees,
            label
          `)
          .in(
            "from_scene_id",
            sceneIds
          )
      : {
          data: [],
          error: null,
        };

  if (linksResult.error) {
    console.error(
      "Erro ao carregar conexões do passeio:",
      linksResult.error
    );
  }

  const sceneLinks =
    (linksResult.data ?? []) as
      SceneLinkRecord[];

  const sceneNames =
    new Map(
      scenes.map(
        (scene) => [
          scene.id,
          scene.name,
        ]
      )
    );

  const scenesWithUrls =
    scenes.map((scene) => ({
      ...scene,
      publicUrl:
        supabase.storage
          .from(
            "virtual-tour-images"
          )
          .getPublicUrl(
            scene.panorama_path
          ).data.publicUrl,
    }));

  const logoPublicUrl =
    tour.logo_path
      ? supabase.storage
          .from(
            "virtual-tour-images"
          )
          .getPublicUrl(
            tour.logo_path
          ).data.publicUrl
      : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-blue-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                Editor de passeio 360°
              </p>

              <h1 className="mt-2 text-3xl font-black">
                {tour.title}
              </h1>

              <p className="mt-2 text-blue-100">
                /tour/{tour.slug} · {scenes.length} ambiente(s)
              </p>
            </div>

            <Link
              href="/admin/tours"
              style={{
                color: "#172554",
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 font-black text-blue-950 transition hover:bg-sky-100"
            >
              Voltar aos passeios
            </Link>
          </div>
        </header>

        {inicio === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Ambiente inicial atualizado com sucesso.
          </div>
        )}

        {excluido === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Ambiente excluído com sucesso.
          </div>
        )}

        {publicado === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Passeio publicado. O link já pode ser enviado ao cliente.
          </div>
        )}

        {rascunho === "1" && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 font-bold text-amber-900">
            O passeio voltou para rascunho e o link público foi desativado.
          </div>
        )}

        {erro === "sem-ambientes" && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-800">
            Adicione pelo menos um ambiente antes de publicar o passeio.
          </div>
        )}

        {conexao === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Conexão entre os ambientes salva com sucesso.
          </div>
        )}

        {conexao_excluida === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Conexão excluída com sucesso.
          </div>
        )}

        {ambiente_atualizado === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Nome do ambiente atualizado com sucesso.
          </div>
        )}

        {ordenado === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Ordem dos ambientes atualizada com sucesso.
          </div>
        )}

        {personalizacao === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Personalização comercial atualizada com sucesso.
          </div>
        )}

        {capa === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Capa do passeio atualizada com sucesso.
          </div>
        )}

        {logo_removido === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Logotipo removido com sucesso.
          </div>
        )}

        {acesso === "1" && (
          <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 font-bold text-green-900">
            Configurações de acesso atualizadas com sucesso.
          </div>
        )}

        {erro === "senha-obrigatoria" && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-800">
            Crie uma senha com pelo menos 6 caracteres para proteger o passeio.
          </div>
        )}

        {erro === "senha-curta" && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-800">
            A nova senha precisa ter pelo menos 6 caracteres.
          </div>
        )}

        {erro === "validade-acesso" && (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 font-bold text-red-800">
            Escolha uma data de validade futura ou deixe o campo vazio.
          </div>
        )}

        {service && service.service_status !== "active" && (
          <div className="mt-6 rounded-2xl border border-orange-300 bg-orange-50 px-5 py-4 text-orange-900">
            <p className="font-black">
              O acesso público deste passeio está bloqueado.
            </p>
            <p className="mt-1 text-sm font-semibold">
              O serviço comercial está {service.service_status === "suspended" ? "suspenso" : "cancelado"}. Reative-o no cadastro do cliente para liberar o link.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-blue-950">
                  Ambientes cadastrados
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  O primeiro ambiente é definido automaticamente como inicial.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                {scenes.length} ambiente(s)
              </span>
            </div>

            {scenesResult.error ? (
              <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700">
                Não foi possível carregar os ambientes.
              </p>
            ) : scenesWithUrls.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <h3 className="font-black text-blue-950">
                  Nenhum ambiente cadastrado
                </h3>

                <p className="mt-2 text-slate-600">
                  Utilize o formulário ao lado para enviar a primeira fotografia 360°.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                {scenesWithUrls.map(
                  (scene, sceneIndex) => {
                    const outgoingLinks =
                      sceneLinks.filter(
                        (link) =>
                          link.from_scene_id ===
                          scene.id
                      );

                    return (
                      <article
                      key={scene.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="aspect-[2/1] overflow-hidden bg-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={scene.publicUrl}
                          alt={`Panorama 360° do ambiente ${scene.name}`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-blue-950">
                            {scene.name}
                          </h3>

                          {scene.is_start && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-900">
                              Ambiente inicial
                            </span>
                          )}

                          {tour.cover_image_path ===
                            scene.panorama_path && (
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-900">
                              Capa do passeio
                            </span>
                          )}
                        </div>

                        <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <summary className="cursor-pointer font-black text-blue-950">
                            Gerenciar ambiente
                          </summary>

                          <div className="mt-4 space-y-4">
                            <form
                              action={updateVirtualTourScene}
                              className="space-y-3 rounded-xl border border-amber-200 bg-white p-4"
                            >
                              <input
                                type="hidden"
                                name="tour_id"
                                value={tour.id}
                              />

                              <input
                                type="hidden"
                                name="scene_id"
                                value={scene.id}
                              />

                              <div>
                                <label
                                  htmlFor={`scene-name-${scene.id}`}
                                  className="text-sm font-black text-blue-950"
                                >
                                  Nome do ambiente
                                </label>

                                <input
                                  id={`scene-name-${scene.id}`}
                                  name="name"
                                  type="text"
                                  required
                                  minLength={2}
                                  maxLength={100}
                                  defaultValue={scene.name}
                                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                                />
                              </div>

                              <button
                                type="submit"
                                style={{
                                  color: "#ffffff",
                                }}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"
                              >
                                Salvar novo nome
                              </button>
                            </form>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h4 className="text-sm font-black text-blue-950">
                                    Ordem no passeio
                                  </h4>

                                  <p className="mt-1 text-xs text-slate-600">
                                    Posição atual: {sceneIndex + 1} de {scenesWithUrls.length}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <form action={moveVirtualTourScene}>
                                  <input
                                    type="hidden"
                                    name="tour_id"
                                    value={tour.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="scene_id"
                                    value={scene.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="direction"
                                    value="up"
                                  />

                                  <button
                                    type="submit"
                                    disabled={sceneIndex === 0}
                                    style={{
                                      color:
                                        sceneIndex === 0
                                          ? "#64748b"
                                          : "#172554",
                                    }}
                                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-blue-950 bg-white px-3 py-2 text-sm font-black text-blue-950 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100"
                                  >
                                    ↑ Subir
                                  </button>
                                </form>

                                <form action={moveVirtualTourScene}>
                                  <input
                                    type="hidden"
                                    name="tour_id"
                                    value={tour.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="scene_id"
                                    value={scene.id}
                                  />

                                  <input
                                    type="hidden"
                                    name="direction"
                                    value="down"
                                  />

                                  <button
                                    type="submit"
                                    disabled={
                                      sceneIndex ===
                                      scenesWithUrls.length - 1
                                    }
                                    style={{
                                      color:
                                        sceneIndex ===
                                        scenesWithUrls.length - 1
                                          ? "#64748b"
                                          : "#172554",
                                    }}
                                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-blue-950 bg-white px-3 py-2 text-sm font-black text-blue-950 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100"
                                  >
                                    ↓ Descer
                                  </button>
                                </form>
                              </div>
                            </div>

                            <VirtualTourSceneImageReplacer
                              tourId={tour.id}
                              sceneId={scene.id}
                              sceneName={scene.name}
                            />
                          </div>
                        </details>

                        <details className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
                          <summary className="cursor-pointer font-black text-blue-950">
                            Configurar setas ({outgoingLinks.length})
                          </summary>

                          <div className="mt-4 space-y-4">
                            {outgoingLinks.length > 0 && (
                              <div className="space-y-2">
                                {outgoingLinks.map(
                                  (link) => (
                                    <div
                                      key={link.id}
                                      className="rounded-xl bg-white p-3 shadow-sm"
                                    >
                                      <p className="text-sm font-black text-slate-900">
                                        → {sceneNames.get(
                                          link.to_scene_id
                                        ) ?? "Ambiente"}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-600">
                                        Horizontal: {Number(
                                          link.yaw_degrees
                                        )}° · Vertical: {Number(
                                          link.pitch_degrees
                                        )}°
                                      </p>

                                      {link.label && (
                                        <p className="mt-1 text-xs font-semibold text-slate-700">
                                          {link.label}
                                        </p>
                                      )}

                                      <form
                                        action={deleteVirtualTourLink}
                                        className="mt-2"
                                      >
                                        <input
                                          type="hidden"
                                          name="tour_id"
                                          value={tour.id}
                                        />

                                        <input
                                          type="hidden"
                                          name="link_id"
                                          value={link.id}
                                        />

                                        <button
                                          type="submit"
                                          style={{
                                            color: "#b91c1c",
                                          }}
                                          className="text-xs font-black text-red-700 underline decoration-red-300 underline-offset-4"
                                        >
                                          Excluir esta seta
                                        </button>
                                      </form>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {scenes.length > 1 ? (
                              <form
                                action={saveVirtualTourLink}
                                className="space-y-3 border-t border-sky-200 pt-4"
                              >
                                <input
                                  type="hidden"
                                  name="tour_id"
                                  value={tour.id}
                                />

                                <input
                                  type="hidden"
                                  name="from_scene_id"
                                  value={scene.id}
                                />

                                <div>
                                  <label
                                    htmlFor={`target-${scene.id}`}
                                    className="text-sm font-bold text-slate-800"
                                  >
                                    Ambiente de destino
                                  </label>

                                  <select
                                    id={`target-${scene.id}`}
                                    name="to_scene_id"
                                    required
                                    defaultValue=""
                                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                                  >
                                    <option value="" disabled>
                                      Selecione
                                    </option>

                                    {scenes
                                      .filter(
                                        (targetScene) =>
                                          targetScene.id !==
                                          scene.id
                                      )
                                      .map(
                                        (targetScene) => (
                                          <option
                                            key={targetScene.id}
                                            value={targetScene.id}
                                          >
                                            {targetScene.name}
                                          </option>
                                        )
                                      )}
                                  </select>
                                </div>

                                <VirtualTourHotspotEditor
                                  panorama={scene.publicUrl}
                                  fieldIdPrefix={`hotspot-${scene.id}`}
                                  initialYawDegrees={0}
                                  initialPitchDegrees={-8}
                                />

                                <input
                                  name="label"
                                  type="text"
                                  maxLength={100}
                                  placeholder="Texto opcional: Ir para a entrada"
                                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                                />

                                <button
                                  type="submit"
                                  style={{
                                    color: "#ffffff",
                                  }}
                                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"
                                >
                                  Salvar seta
                                </button>
                              </form>
                            ) : (
                              <p className="text-sm leading-6 text-slate-600">
                                Adicione outro ambiente para criar uma conexão.
                              </p>
                            )}
                          </div>
                        </details>

                        <div className="mt-4 flex flex-col gap-2">
                          {tour.cover_image_path !==
                            scene.panorama_path && (
                            <form action={setVirtualTourCover}>
                              <input
                                type="hidden"
                                name="tour_id"
                                value={tour.id}
                              />

                              <input
                                type="hidden"
                                name="scene_id"
                                value={scene.id}
                              />

                              <button
                                type="submit"
                                style={{
                                  color: "#5b21b6",
                                }}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-bold text-violet-800 transition hover:bg-violet-100"
                              >
                                Usar como capa do passeio
                              </button>
                            </form>
                          )}

                          {!scene.is_start && (
                            <form action={setStartScene}>
                              <input
                                type="hidden"
                                name="tour_id"
                                value={tour.id}
                              />

                              <input
                                type="hidden"
                                name="scene_id"
                                value={scene.id}
                              />

                              <button
                                type="submit"
                                style={{
                                  color: "#172554",
                                }}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-950 bg-white px-4 py-2 font-bold text-blue-950 transition hover:bg-sky-50"
                              >
                                Definir como inicial
                              </button>
                            </form>
                          )}

                          <form action={deleteVirtualTourScene}>
                            <input
                              type="hidden"
                              name="tour_id"
                              value={tour.id}
                            />

                            <input
                              type="hidden"
                              name="scene_id"
                              value={scene.id}
                            />

                            <button
                              type="submit"
                              style={{
                                color: "#b91c1c",
                              }}
                              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2 font-bold text-red-700 transition hover:bg-red-50"
                            >
                              Excluir ambiente
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <VirtualTourSceneUploader
              tourId={tour.id}
              nextPosition={scenes.length}
            />

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-black text-blue-950">
                Personalização comercial
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Configure a identidade que o cliente verá no link público.
              </p>

              <form
                action={updateVirtualTourBranding}
                className="mt-5 space-y-4"
              >
                <input
                  type="hidden"
                  name="tour_id"
                  value={tour.id}
                />

                <div>
                  <label
                    htmlFor="tour-brand-name"
                    className="text-sm font-black text-slate-800"
                  >
                    Marca exibida
                  </label>

                  <input
                    id="tour-brand-name"
                    name="brand_name"
                    type="text"
                    required
                    maxLength={120}
                    defaultValue={
                      tour.brand_name ??
                      "Aluga Casa Búzios"
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tour-contact-name"
                    className="text-sm font-black text-slate-800"
                  >
                    Nome do contato
                  </label>

                  <input
                    id="tour-contact-name"
                    name="contact_name"
                    type="text"
                    maxLength={120}
                    autoComplete="name"
                    defaultValue={
                      tour.contact_name ??
                      ""
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tour-contact-whatsapp"
                    className="text-sm font-black text-slate-800"
                  >
                    WhatsApp
                  </label>

                  <input
                    id="tour-contact-whatsapp"
                    name="contact_whatsapp"
                    type="tel"
                    inputMode="tel"
                    maxLength={25}
                    autoComplete="tel"
                    placeholder="5524999999999"
                    defaultValue={
                      tour.contact_whatsapp ??
                      ""
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tour-contact-phone"
                    className="text-sm font-black text-slate-800"
                  >
                    Telefone
                  </label>

                  <input
                    id="tour-contact-phone"
                    name="contact_phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={25}
                    autoComplete="tel"
                    placeholder="552426230000"
                    defaultValue={
                      tour.contact_phone ??
                      ""
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="tour-primary-color"
                      className="text-sm font-black text-slate-800"
                    >
                      Cor principal
                    </label>

                    <input
                      id="tour-primary-color"
                      name="primary_color"
                      type="color"
                      defaultValue={
                        tour.primary_color ??
                        "#172554"
                      }
                      className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tour-accent-color"
                      className="text-sm font-black text-slate-800"
                    >
                      Destaque
                    </label>

                    <input
                      id="tour-accent-color"
                      name="accent_color"
                      type="color"
                      defaultValue={
                        tour.accent_color ??
                        "#38BDF8"
                      }
                      className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="white_label"
                    type="checkbox"
                    defaultChecked={
                      tour.white_label ===
                      true
                    }
                    className="mt-1 h-5 w-5 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-black text-blue-950">
                      Marca branca
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      Oculta a identificação da Aluga Casa Búzios no rodapé público.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-black text-white shadow-md transition hover:bg-blue-900"
                >
                  Salvar personalização
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <VirtualTourLogoUploader
                  tourId={tour.id}
                  currentLogoUrl={
                    logoPublicUrl
                  }
                />

                {tour.logo_path && (
                  <form
                    action={removeVirtualTourLogo}
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="tour_id"
                      value={tour.id}
                    />

                    <button
                      type="submit"
                      style={{
                        color: "#b91c1c",
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-50"
                    >
                      Remover logotipo
                    </button>
                  </form>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-black text-blue-950">
                Privacidade e validade
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Defina se o link abre diretamente ou exige senha e quando ele deve expirar.
              </p>

              <form
                action={updateVirtualTourAccess}
                className="mt-5 space-y-4"
              >
                <input
                  type="hidden"
                  name="tour_id"
                  value={tour.id}
                />

                <div>
                  <label
                    htmlFor="tour-access-mode"
                    className="text-sm font-black text-slate-800"
                  >
                    Forma de acesso
                  </label>

                  <select
                    id="tour-access-mode"
                    name="access_mode"
                    defaultValue={tour.access_mode ?? "public"}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  >
                    <option value="public">
                      Público — abre sem senha
                    </option>
                    <option value="password">
                      Privado — exige senha
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="tour-access-password"
                    className="text-sm font-black text-slate-800"
                  >
                    {tour.access_password_hash
                      ? "Nova senha (opcional)"
                      : "Senha do passeio"}
                  </label>

                  <input
                    id="tour-access-password"
                    name="access_password"
                    type="password"
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder={tour.access_password_hash
                      ? "Deixe vazio para manter a senha atual"
                      : "Mínimo de 6 caracteres"}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {tour.access_password_hash
                      ? "Já existe uma senha protegida. Digite outra somente se desejar substituí-la."
                      : "A senha será criptografada e não poderá ser visualizada depois."}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tour-access-expires-at"
                    className="text-sm font-black text-slate-800"
                  >
                    Validade do link (opcional)
                  </label>

                  <input
                    id="tour-access-expires-at"
                    name="access_expires_at"
                    type="datetime-local"
                    defaultValue={formatAccessExpiration(tour.access_expires_at)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Deixe vazio para o link não expirar automaticamente.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-black text-slate-900">
                    Situação atual
                  </p>
                  <p className="mt-1 text-slate-600">
                    {tour.access_mode === "password"
                      ? "Link protegido por senha"
                      : "Link público sem senha"}
                    {tour.access_expires_at
                      ? ` · expira em ${new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Sao_Paulo",
                        }).format(new Date(tour.access_expires_at))}`
                      : " · sem validade definida"}
                  </p>
                </div>

                <button
                  type="submit"
                  style={{
                    color: "#ffffff",
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 font-black text-white shadow-md transition hover:bg-blue-900"
                >
                  Salvar configurações de acesso
                </button>
              </form>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-black text-blue-950">
                Publicação e link
              </h2>

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-bold text-slate-500">
                    Situação
                  </dt>

                  <dd className="mt-1 font-black text-slate-900">
                    {tour.status === "published"
                      ? "Publicado"
                      : "Rascunho"}
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-slate-500">
                    Marca
                  </dt>

                  <dd className="mt-1 font-black text-slate-900">
                    {tour.brand_name ??
                      "Aluga Casa Búzios"}
                  </dd>
                </div>

                <div>
                  <dt className="font-bold text-slate-500">
                    Endereço público
                  </dt>

                  <dd className="mt-1 break-all font-black text-slate-900">
                    /tour/{tour.slug}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                {tour.status === "published" ? (
                  <>
                    <a
                      href={`/tour/${tour.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#ffffff",
                      }}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center font-black text-white shadow-md transition hover:bg-green-800"
                    >
                      Abrir passeio público
                    </a>

                    <form action={unpublishVirtualTour}>
                      <input
                        type="hidden"
                        name="tour_id"
                        value={tour.id}
                      />

                      <button
                        type="submit"
                        style={{
                          color: "#92400e",
                        }}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-amber-400 bg-amber-50 px-5 py-3 font-black text-amber-800 transition hover:bg-amber-100"
                      >
                        Retirar publicação
                      </button>
                    </form>
                  </>
                ) : (
                  <form action={publishVirtualTour}>
                    <input
                      type="hidden"
                      name="tour_id"
                      value={tour.id}
                    />

                    <button
                      type="submit"
                      disabled={scenes.length === 0}
                      style={{
                        color: "#ffffff",
                      }}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 font-black text-white shadow-md transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Publicar e liberar link
                    </button>

                    {scenes.length === 0 && (
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                        Adicione o primeiro ambiente para liberar a publicação.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </section>

            {tour.status === "published" && (
              <VirtualTourSharePanel
                path={`/tour/${tour.slug}`}
                slug={tour.slug}
                title={tour.title}
                accessMode={tour.access_mode}
                accessExpiresAt={tour.access_expires_at}
              />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
