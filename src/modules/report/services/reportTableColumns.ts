import type { RegisterReportId } from "../screens/RegisterReportScreen";
import type { TrackerId } from "./AllTrackersService";
import { reportTableValue } from "./reportTableFormat";

export interface ReportColumn {
  data: string;
  title: string;
  aliases?: string[];
  render?: (data: any, type: string, row: any) => any;
  read?: (row: Record<string, unknown>) => unknown;
}

// interface ReportColumn {
//   data: string;
//   title: string;
//   aliases?: string[];
//   render?: (data: any, type: string, row: any) => any;
//   read?: (row: Record<string, unknown>) => unknown;
// }

const location = (...dateAliases: string[]): ReportColumn[] => [
  { data: "date", title: "Date", aliases: ["report_date", ...dateAliases] },
  { data: "store", title: "Store Name", aliases: ["store_name"] },
  { data: "region", title: "Region" },
  { data: "zone", title: "Zone" },
];

const stages = (count: number, legacyNames = false): ReportColumn[] =>
  Array.from({ length: count }, (_, index) => {
    const stage = index + 1;
    return [
      {
        data: `s${stage}_name`,
        title: `S${stage} Name`,
        aliases: [
          `s${stage}_emp_name`,
          `s${stage}_employee_name`,
          ...(legacyNames ? [`s${stage}`, `s${stage}_emp_code`] : []),
        ],
      },
      {
        data: `s${stage}_created_on`,
        title: `S${stage} Created On`,
        aliases: [`s${stage}_created_at`],
      },
    ];
  }).flat();

// Edit data (API field), title (header text), and order here. aliases support legacy API field names.
export const REGISTER_TABLE_COLUMNS: Record<
  RegisterReportId,
  readonly ReportColumn[]
> = {
  alteration: [
    ...location(),
    // { data: "used_status", title: "Used Status", aliases: ["UsedStatus"] },
    {
      data: "used_status",
      title: "Used Status",
      aliases: ["UsedStatus"],
      render: (data: any, type: string) => {
        if (type !== "display") return data;
        const isUsed = String(data).toLowerCase() === "used";
        return `
            <span class="badge ${isUsed ? "badge-success" : "badge-danger"}">
                ${isUsed ? "Used" : "Un used"}
            </span>
        `;
      },
    },
    {
      data: "total_received",
      title: "Total Received",
      aliases: ["TotalReceived"],
    },
    {
      data: "total_qty_received",
      title: "Total Quantity Received",
      aliases: ["TotalQtyReceived"],
    },
    {
      data: "delivered_count",
      title: "Delivered Count",
      aliases: ["DeliveredCount"],
    },
    {
      data: "delivered_qty",
      title: "Delivered Quantity",
      aliases: ["DeliveredQty"],
    },
    {
      data: "pending_count",
      title: "Pending Count",
      aliases: ["PendingCount"],
    },
    { data: "pending_qty", title: "Pending Quantity", aliases: ["PendingQty"] },
    { data: "s3_pending", title: "S3 Pending", aliases: ["S3Pending"] },
  ],
  footfall: [
    ...location(),
    { data: "slot_1", title: "9 AM - 11 AM", aliases: ["9AM-11AM"] },
    { data: "slot_2", title: "11 AM - 12 PM", aliases: ["11AM-12PM"] },
    {
      data: "slot_3",
      title: "12 PM - 1 PM",
      aliases: ["12AM-1PM", "12PM-1PM"],
    },
    { data: "slot_4", title: "1 PM - 2 PM", aliases: ["1PM-2PM"] },
    { data: "slot_5", title: "2 PM - 3 PM", aliases: ["2PM-3PM"] },
    { data: "slot_6", title: "3 PM - 4 PM", aliases: ["3PM-4PM"] },
    { data: "slot_7", title: "4 PM - 5 PM", aliases: ["4PM-5PM"] },
    { data: "slot_8", title: "5 PM - 6 PM", aliases: ["5PM-6PM"] },
    { data: "slot_9", title: "6 PM - 7 PM", aliases: ["6PM-7PM"] },
    { data: "slot_10", title: "7 PM - 8 PM", aliases: ["7PM-8PM"] },
    { data: "slot_11", title: "8 PM - 9 PM", aliases: ["8PM-9PM"] },
    { data: "slot_12", title: "9 PM - 10 PM", aliases: ["9PM-10PM"] },
    { data: "slot_13", title: "10 PM - Closing", aliases: ["10PM-Closing"] },
    { data: "total_footfall", title: "Total Footfall" },
    { data: "remark", title: "Remark" },
    { data: "verified_by", title: "Verified By" },
    { data: "alert_status", title: "Alert Status" },
  ],
  exchange: [
    ...location("Exchange Date"),
    { data: "total_gate_passes", title: "Total Gate Passes" },
    { data: "total_exchange_qty", title: "Total Exchange Quantity" },
    { data: "total_mrp_value", title: "Total MRP Value" },
    { data: "percent_colour_fade", title: "Colour Fade %" },
    { data: "percent_damage_defective", title: "Damage / Defective %" },
    { data: "percent_offer_issue", title: "Offer Issue %" },
    { data: "percent_colour_exchange", title: "Colour Exchange %" },
    { data: "percent_size_exchange", title: "Size Exchange %" },
    { data: "percent_wrong_billing", title: "Wrong Billing %" },
    { data: "percent_oneclick_exchange", title: "Oneclick Exchange %" },
    { data: "percent_other", title: "Other %" },
    ...stages(2),
  ],
  electricity: [
    ...location(),
    { data: "opening_kwh", title: "Opening kWh", aliases: ["Opening kWh"] },
    { data: "closing_kwh", title: "Closing kWh", aliases: ["Closing kWh"] },
    { data: "total_kwh", title: "Total kWh", aliases: ["Total kWh"] },
    { data: "opening_kvah", title: "Opening kVAh", aliases: ["Opening kVAh"] },
    { data: "closing_kvah", title: "Closing kVAh", aliases: ["Closing kVAh"] },
    { data: "total_kvah", title: "Total kVAh", aliases: ["Total kVAh"] },
    { data: "pf", title: "PF" },
    { data: "remark", title: "Remark", aliases: ["pf_remark"] },
    ...stages(3),
  ],
  generator: [
    ...location("generator_date"),
    { data: "opening_run_hour", title: "Opening Run Hour" },
    { data: "closing_run_hour", title: "Closing Run Hour" },
    { data: "total_run_hour", title: "Total Run Hour" },
    { data: "opening_diesel", title: "Opening Diesel" },
    { data: "diesel_purchased", title: "Diesel Purchased" },
    { data: "closing_diesel", title: "Closing Diesel" },
    { data: "total_diesel_consumed", title: "Total Diesel Consumed" },
    { data: "diesel_consumed_per_hour", title: "Diesel Consumed Per Hour" },
    { data: "remark", title: "Remark", aliases: ["pf_remark"] },
    ...stages(3),
  ],
  hk_sg: [
    ...location(),
    { data: "nos_hk_present", title: "Housekeeping Present" },
    { data: "nos_sg_present", title: "Security Guards Present" },
    { data: "total_present", title: "Total Present" },
    { data: "min_work_hr", title: "Minimum Work Hours" },
    { data: "expected_work_hr", title: "Expected Work Hours" },
    { data: "actual_work_hr", title: "Actual Work Hours" },
    { data: "working_hr_deficit", title: "Work Hour Deficit" },
    { data: "total_submissions", title: "Total Submissions" },
    { data: "same_date_submissions", title: "Same Date Submissions" },
    { data: "back_date_submissions", title: "Backdated Submissions" },
    { data: "compliance_percentage", title: "Compliance %" },
    ...stages(3),
  ],
  lost_found: [
    ...location(),
    { data: "total_lost_found_reported", title: "Total Lost & Found Reported" },
    { data: "total_claimed_on_same_date", title: "Claimed on Same Date" },
    ...stages(3),
  ],
  scrap: [
    ...location(),
    { data: "regular_scrap_total", title: "Regular Scrap Total" },
    { data: "non_apps_damage_total", title: "Non-Apps Damage Total" },
    { data: "fmcg_de_total", title: "FMCG D&E Total" },
    { data: "tso_damage_total", title: "TSO Damage Total" },
    { data: "total_submissions", title: "Total Submissions" },
    { data: "same_date_submissions", title: "Same Date Submissions" },
    { data: "back_date_submissions", title: "Backdated Submissions" },
    { data: "compliance_percentage", title: "Compliance %" },
    ...stages(3),
  ],
  global_count: [
    ...location(),
    { data: "total_damage", title: "Total Damage" },
    { data: "total_tester", title: "Total Tester" },
    { data: "total_good", title: "Total Good" },
    { data: "physical_count", title: "Physical Count" },
    { data: "system_qty", title: "System Quantity" },
    { data: "difference", title: "Difference" },
    ...stages(2),
  ],
  pi: [
    ...location("pi_date"),
    { data: "division_name", title: "Division" },
    { data: "section_name", title: "Section" },
    { data: "department_name", title: "Department" },
    { data: "fascia_number", title: "Fascia Number" },
    { data: "barcode", title: "Barcode" },
    { data: "s1_name", title: "S1 Name" },
    { data: "s1_created_on", title: "S1 Created On", aliases: ["created_at"] },
  ],
  key_movement: [
    ...location(),
    { data: "opening_issued_to", title: "Opening Issued To" },
    { data: "opening_issuer", title: "Opening Issuer" },
    { data: "closing_issued_to", title: "Closing Issued To" },
    { data: "closing_issuer", title: "Closing Issuer" },
    { data: "safe_issued_to", title: "Safe Issued To" },
    { data: "safe_issuer", title: "Safe Issuer" },
    { data: "actual_entries", title: "Actual Entries" },
    {
      data: "compliance_percent",
      title: "Compliance %",
      aliases: ["Compliance %"],
    },
    ...stages(3),
  ],
  fmcg_price_mismatch: [
    ...location("price_mismatch_date"),
    { data: "division", title: "Division" },
    { data: "department", title: "Department" },
    { data: "barcode", title: "Barcode" },
    { data: "product_written_price", title: "Product Written Price" },
    { data: "system_price", title: "System Price" },
    { data: "difference", title: "Difference" },
    ...stages(2, true),
  ],
};

const damageFields: ReportColumn[] = [
  { data: "division", title: "Division" },
  { data: "barcode", title: "Barcode" },
  { data: "reason", title: "Reason" },
  { data: "damage_qty", title: "Damage Quantity" },
  { data: "month_expiry", title: "Expiry Month" },
  { data: "remarks", title: "Remarks" },
];

export const TRACKER_TABLE_COLUMNS: Record<TrackerId, readonly ReportColumn[]> =
  {
    fmcg_de: [...location("fmcg_date"), ...damageFields, ...stages(1)],
    non_apps_dd: [...location("non_app_date"), ...damageFields, ...stages(1)],
    snap_up_dd: [...location("snap_app_date"), ...damageFields, ...stages(1)],
    beauty_dd: [
      ...location("beauty_date"),
      { data: "department", title: "Department" },
      { data: "item_name", title: "Item Name" },
      { data: "barcode", title: "Barcode" },
      { data: "reason", title: "Reason" },
      { data: "damage_qty", title: "Damage Quantity" },
      { data: "month_expiry", title: "Expiry Month" },
      { data: "remarks", title: "Remarks" },
      ...stages(1),
    ],
    tso_dd: [
      ...location("all_tr_date"),
      { data: "item_name", title: "Item Name" },
      { data: "barcode", title: "Barcode" },
      { data: "reason_for_dd", title: "Reason for D&D", aliases: ["reason"] },
      {
        data: "damage_defective_qty",
        title: "Damage / Defective Quantity",
        aliases: ["damage_qty"],
      },
      {
        data: "month_of_declaration",
        title: "Declaration Month",
        aliases: ["month_expiry"],
      },
      { data: "remarks", title: "Remarks" },
      ...stages(1),
    ],
    store_incident_log: [
      ...location("inciden_date", "date_of_inciden"),
      { data: "incident_bucket", title: "Incident Bucket" },
      { data: "write_detail_incident_details", title: "Incident Details" },
      { data: "loss_amount", title: "Loss Amount" },
      { data: "recovary_amount", title: "Recovery Amount" },
      { data: "remark", title: "Remark" },
      ...stages(1),
    ],
    jewellery_hair_accessories_dd: [
      ...location("jwellery_date"),
      { data: "section", title: "Section" },
      { data: "department", title: "Department" },
      { data: "barcode", title: "Barcode" },
      { data: "damage_or_defective_qty", title: "Damage / Defective Quantity" },
      { data: "month_of_declaration", title: "Declaration Month" },
      { data: "reason", title: "Reason" },
      { data: "remark", title: "Remark" },
      ...stages(1),
    ],
    unloading_payment: [
      ...location("uploading_date"),
      { data: "transfer_number", title: "Transfer Number" },
      { data: "loading_unloading_mode", title: "Loading / Unloading Mode" },
      {
        data: "loading_unloading_done_by",
        title: "Loading / Unloading Done By",
      },
      { data: "stock_receives_from", title: "Stock Received From" },
      { data: "fmcg_packets", title: "FMCG Packets" },
      { data: "apparels_packets", title: "Apparel Packets" },
      { data: "other_ownuse_packets", title: "Other / Own Use Packets" },
      { data: "total_packets", title: "Total Packets" },
      { data: "total_cost", title: "Total Cost" },
      { data: "packets_loaded", title: "Packets Loaded" },
      { data: "vehicle_number", title: "Vehicle Number" },
      { data: "employee_name", title: "Employee Name" },
      { data: "employee_code", title: "Employee Code" },
      ...stages(2),
    ],
    canteen_fooding: [
      ...location(),
      { data: "month_type", title: "Month Type" },
      { data: "month", title: "Month" },
      { data: "how_many_emp", title: "Employee Count" },
      { data: "employee_name", title: "Employee Name" },
      { data: "employee_code", title: "Employee Code" },
      { data: "canteen_attendance", title: "Canteen Attendance" },
      ...stages(2),
    ],
    fmcg_price_mismatch: [
      ...location("price_mismatch_date"),
      { data: "division", title: "Division" },
      { data: "department", title: "Department" },
      { data: "barcode", title: "Barcode" },
      { data: "product_written_price", title: "Product Written Price" },
      { data: "system_price", title: "System Price" },
      { data: "difference", title: "Difference" },
      ...stages(2),
    ],
    grt_packet_readiness: [
      ...location("grt_packet_date"),
      { data: "category", title: "Category" },
      { data: "rc_number", title: "RC Number" },
      { data: "packet_type", title: "Packet Type" },
      {
        data: "how_many_packed_ready_for_pickup",
        title: "Packets Ready for Pickup",
      },
      { data: "decleared_packet_ready", title: "Declared Packets Ready" },
      { data: "how_many_total_qty_ready", title: "Total Quantity Ready" },
      ...stages(2),
    ],
    ist_packet_readiness: [
      ...location("ist_packet_date"),
      { data: "ist_zone", title: "IST Zone" },
      { data: "ist_region", title: "IST Region" },
      { data: "ist_store", title: "IST Store", aliases: ["ist_store_name"] },
      {
        data: "total_grt_qty_available_in_store",
        title: "Total GRT Quantity Available",
        aliases: ["ist_planned_qty"],
      },
      {
        data: "how_many_qty_packing_completed",
        title: "Packing Completed Quantity",
      },
      { data: "remaining_qty", title: "Remaining Quantity" },
      { data: "how_many_packet_ready", title: "Packets Ready" },
      { data: "remark", title: "Remark" },
      ...stages(2),
    ],
    near_to_expiry: [
      ...location("near_to_expiry_tracker_date"),
      { data: "fmcg_nte_for_next_month", title: "FMCG NTE for Next Month" },
      { data: "division", title: "Division" },
      { data: "barcode", title: "Barcode" },
      { data: "net_qty", title: "Net Quantity" },
      { data: "month_of_epiry", title: "Expiry Month" },
      { data: "date_of_expiry", title: "Expiry Date" },
      ...stages(2),
    ],
    damage_apparel: [
      ...location("damage_apparel_date"),
      { data: "barcode", title: "Barcode" },
      { data: "damage_bucket", title: "Damage Bucket" },
      { data: "damage_bucket_list", title: "Damage Bucket List" },
      { data: "qty", title: "Quantity" },
      ...stages(2),
    ],
    missing_tag: [
      ...location(),
      { data: "missing_count", title: "Missing Tag Count" },
    ],
    sensor_tag: [
      ...location("sensor_tag_date"),
      { data: "tag_packet_issued_to_whom", title: "Issued To" },
      { data: "tag_packet_issued_count", title: "Tag Count" },
      { data: "pin_packet_issued_count", title: "Pin Count" },
      { data: "issuance_status", title: "Issuance Status" },
      { data: "total_issuances", title: "Total Issuances" },
      ...stages(3),
    ],
    monthly_lp_global_count: [
      ...location("monthly_lp_date"),
      { data: "division", title: "Division" },
      { data: "group", title: "Group", aliases: ["group_name"] },
      { data: "physical_qty", title: "Physical Quantity" },
      { data: "employee_name", title: "Employee Name" },
      ...stages(2),
    ],
  };

export function trackerReportColumns(
  trackerId: TrackerId,
  apiColumns: readonly ReportColumn[],
  rows: readonly Record<string, unknown>[],
): readonly ReportColumn[] {
  const fixed = TRACKER_TABLE_COLUMNS[trackerId];
  if (trackerId !== "sensor_tag") return fixed;

  const questions = new Map<string, ReportColumn>();
  for (const column of apiColumns) {
    if (/^Q_\d+$/i.test(column.data)) questions.set(column.data, column);
  }
  // Older responses may have question values without column metadata.
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (/^Q_\d+$/i.test(key) && !questions.has(key)) {
        questions.set(key, { data: key, title: key });
      }
    }
  }
  return [...fixed.slice(0, 4), ...questions.values(), ...fixed.slice(4)];
}

function normalize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");
}

export function staticReportCells(
  row: Record<string, unknown>,
  columns: readonly ReportColumn[],
): string[] {
  const values = new Map(
    Object.entries(row).map(([key, value]) => [normalize(key), value]),
  );
  return columns.map((item) => {
    const key = [item.data, ...(item.aliases ?? [])]
      .map(normalize)
      .find((alias) => values.has(alias));
    const value = item.read
      ? item.read(row)
      : key === undefined
        ? undefined
        : values.get(key);
    return reportTableValue(item.data, value);
  });
}
