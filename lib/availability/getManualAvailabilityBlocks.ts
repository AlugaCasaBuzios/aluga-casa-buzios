import {
  createSupabaseServerClient,
} from "@/lib/supabaseServer";

type ManualAvailabilityBlockRow = {
  id: string;
  start_date: string;
  end_date_exclusive: string;
  reason: string | null;
};

export type ManualAvailabilityBlocksSource =
  | "supabase"
  | "empty";

export interface ManualAvailabilityBlock {
  id: string;
  startDate: string;
  endDateExclusive: string;
  reason: string | null;
  source: "manual";
}

export interface ManualAvailabilityBlocksResult {
  periods: ManualAvailabilityBlock[];
  source: ManualAvailabilityBlocksSource;
}

function getEmptyResult():
  ManualAvailabilityBlocksResult {
  return {
    periods: [],
    source: "empty",
  };
}

export async function getManualAvailabilityBlocks(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<ManualAvailabilityBlocksResult> {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data,
      error,
    } = await supabase
      .from("manual_availability_blocks")
      .select(`
        id,
        start_date,
        end_date_exclusive,
        reason
      `)
      .eq("property_id", propertyId)
      .eq("active", true)

      /*
       * Busca somente bloqueios que cruzam
       * o período consultado.
       */
      .lt("start_date", checkOut)
      .gt("end_date_exclusive", checkIn)

      .order("start_date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao consultar bloqueios manuais:",
        error
      );

      return getEmptyResult();
    }

    const rows =
      (data ?? []) as ManualAvailabilityBlockRow[];

    const periods: ManualAvailabilityBlock[] =
      rows.map((row) => ({
        id: row.id,
        startDate: row.start_date,
        endDateExclusive:
          row.end_date_exclusive,
        reason: row.reason,
        source: "manual",
      }));

    return {
      periods,
      source: "supabase",
    };
  } catch (error) {
    console.error(
      "Falha ao carregar bloqueios manuais:",
      error
    );

    return getEmptyResult();
  }
}