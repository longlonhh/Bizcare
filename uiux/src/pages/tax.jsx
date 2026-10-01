import { useMemo, useState } from "react";
import { Building2, FileCode2, Home, Loader2, Receipt } from "lucide-react";

import {
  DataTable,
  EmptyRow,
  ErrorBlock,
  Field,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  Td,
} from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { taxApi } from "@/lib/api";
import { currentMonthValue, num, parseMonthValue, vnd } from "@/lib/format";
import { periodTypeLabels, taxPeriodLabel, taxTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const BUSINESS_TYPES = [
  {
    value: "wholesale_retail",
    label: "Phân phối, bán buôn, bán lẻ hàng hóa",
    rate: 1.5,
    detail: "GTGT 1.0% + TNCN 0.5%",
  },
  {
    value: "manufacturing_transport",
    label: "Sản xuất, vận tải, dịch vụ gắn với hàng hóa",
    rate: 4.5,
    detail: "GTGT 3.0% + TNCN 1.5%",
  },
  {
    value: "services_construction",
    label: "Dịch vụ, xây dựng không bao thầu nguyên vật liệu",
    rate: 7.0,
    detail: "GTGT 5.0% + TNCN 2.0%",
  },
];

const CIT_TIERS = [
  { rate: 15, label: "Doanh thu dưới 3 tỷ" },
  { rate: 17, label: "Doanh thu 3 - 50 tỷ" },
  { rate: 20, label: "Doanh thu trên 50 tỷ" },
];

export default function TaxPage() {
  const { hasRole } = useAuth();
  const canCalculate = hasRole("admin", "accountant");

  const now = new Date();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [businessType, setBusinessType] = useState("wholesale_retail");
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [householdResult, setHouseholdResult] = useState(null);
  const [vatResult, setVatResult] = useState(null);
  const [citResult, setCitResult] = useState(null);
  const [xml, setXml] = useState(null);

  const records = useResource(() => taxApi.getRecords(), []);

  const rows = records.data || [];

  const latest = useMemo(() => {
    const pick = (taxType) => rows.find((r) => r.taxType === taxType) || null;
    return {
      output: pick("vat_output"),
      input: pick("vat_input"),
      payable: pick("vat_payable"),
    };
  }, [rows]);

  const handleHousehold = async () => {
    const { year: y, month: m } = parseMonthValue(monthValue);
    setBusy("household");
    setNotice(null);
    try {
      setHouseholdResult(await taxApi.calculateHousehold({ year: y, month: m, businessType }));
      setNotice({ tone: "success", message: "Đã tính thuế khoán và lưu vào lịch sử kê khai" });
      records.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy("");
    }
  };

  const handleVat = async () => {
    setBusy("vat");
    setNotice(null);
    try {
      setVatResult(await taxApi.calculateVat({ year, quarter }));
      setNotice({ tone: "success", message: "Đã tổng hợp thuế GTGT theo quý" });
      records.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy("");
    }
  };

  const handleCit = async () => {
    setBusy("cit");
    setNotice(null);
    try {
      setCitResult(await taxApi.calculateCit({ year }));
      setNotice({ tone: "success", message: "Đã tính thuế TNDN theo năm" });
      records.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy("");
    }
  };

  const handleExportXml = async () => {
    setBusy("xml");
    setNotice(null);
    try {
      const result = await taxApi.exportXml({ year, quarter });
      setXml(result.xml);
      setNotice({
        tone: "success",
        message: "Đã sinh tờ khai XML và lưu kèm bản ghi GTGT phải nộp",
      });
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <PageHeader
        
        title="Tính thuế tự động"
        actions={
          canCalculate ? (
            <Button size="sm" onClick={handleExportXml} disabled={busy === "xml"}>
              {busy === "xml" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCode2 className="size-4" />
              )}
              Xuất tờ khai XML
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="GTGT đầu ra (kỳ gần nhất)"
          value={latest.output?.vatOutput || 0}
          hint={latest.output ? taxPeriodLabel(latest.output) : "Chưa có dữ liệu"}
        />
        <StatCard
          label="GTGT đầu vào (kỳ gần nhất)"
          value={latest.input?.vatInput || 0}
          hint={latest.input ? taxPeriodLabel(latest.input) : "Chưa có dữ liệu"}
        />
        <StatCard
          label="GTGT phải nộp (kỳ gần nhất)"
          value={latest.payable?.vatPayable || 0}
          hint="Đầu ra − Đầu vào"
        />
        <StatCard
          label="Bản ghi kê khai đã lưu"
          value={rows.length}
          currency={false}
          unit="bản ghi"
        />
      </div>

      <Tabs defaultValue="khoan" className="mt-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1">
          <TabsTrigger value="khoan" className="gap-2">
            <Home className="size-4" /> Thuế khoán hộ KD
          </TabsTrigger>
          <TabsTrigger value="gtgt" className="gap-2">
            <Receipt className="size-4" /> GTGT khấu trừ
          </TabsTrigger>
          <TabsTrigger value="tndn" className="gap-2">
            <Building2 className="size-4" /> TNDN SMEs
          </TabsTrigger>
          <TabsTrigger value="xml" className="gap-2">
            <FileCode2 className="size-4" /> Tờ khai XML
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Thuế khoán hộ kinh doanh ---------------- */}
        <TabsContent value="khoan" className="mt-4">
          <Panel title="Thuế khoán hộ kinh doanh" description="Thông tư 40/2021/TT-BTC">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Kỳ tính thuế">
                <Input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                />
              </Field>
              <Field label="Ngành nghề kinh doanh" className="sm:col-span-2">
                <select
                  className="field"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} — {type.rate}%
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setBusinessType(type.value)}
                  className={
                    businessType === type.value
                      ? "rounded-xl border-2 border-primary bg-primary/5 p-4 text-left"
                      : "rounded-xl border border-border p-4 text-left transition-colors hover:bg-secondary"
                  }
                >
                  <p className="font-display text-2xl font-bold text-primary">{type.rate}%</p>
                  <p className="mt-1 text-sm font-medium leading-snug">{type.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{type.detail}</p>
                </button>
              ))}
            </div>

            {canCalculate ? (
              <Button className="mt-4" onClick={handleHousehold} disabled={busy === "household"}>
                {busy === "household" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Receipt className="size-4" />
                )}
                Tính thuế khoán kỳ này
              </Button>
            ) : null}

            {householdResult ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Doanh thu bóc tách</p>
                  <p className="num font-display text-lg font-bold">{vnd(householdResult.totalRevenue)}</p>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">
                    GTGT ({householdResult.vatRate}%) + TNCN ({householdResult.pitRate}%)
                  </p>
                  <p className="num font-display text-lg font-bold">
                    {vnd(householdResult.vatAmount)} + {vnd(householdResult.pitAmount)}
                  </p>
                </div>
                <div className="rounded-xl gradient-indigo p-4 text-white shadow-sm">
                  <p className="text-xs font-medium text-white/90">Tổng thuế phải nộp</p>
                  <p className="num font-display text-lg font-bold text-white">{vnd(householdResult.totalTax)}</p>
                </div>
              </div>
            ) : null}
          </Panel>
        </TabsContent>

        {/* ---------------- GTGT khấu trừ ---------------- */}
        <TabsContent value="gtgt" className="mt-4">
          <Panel
            title="Thuế GTGT doanh nghiệp SMEs"
            description="Phương pháp khấu trừ · gom toàn bộ phiếu xuất đã xuất kho và phiếu nhập đã nhập kho trong quý"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Năm">
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="2000"
                />
              </Field>
              <Field label="Quý">
                <select
                  className="field"
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      Quý {q}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={handleVat}
                  disabled={!canCalculate || busy === "vat"}
                >
                  {busy === "vat" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Receipt className="size-4" />
                  )}
                  Tính thuế GTGT quý
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
              <p className="font-display text-sm font-semibold text-primary">
                Thuế GTGT phải nộp = Thuế GTGT đầu ra − Thuế GTGT đầu vào
              </p>
            </div>

            {vatResult ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-secondary p-4">
                    <p className="text-xs text-muted-foreground">Đầu ra (bán)</p>
                    <p className="num font-display text-lg font-bold">{vnd(vatResult.vatOutput)}</p>
                  </div>
                  <div className="rounded-xl bg-secondary p-4">
                    <p className="text-xs text-muted-foreground">Đầu vào (nhập)</p>
                    <p className="num font-display text-lg font-bold">{vnd(vatResult.vatInput)}</p>
                  </div>
                  <div className="rounded-xl gradient-indigo p-4 text-white shadow-sm">
                    <p className="text-xs font-medium text-white/90">Chênh lệch phải nộp</p>
                    <p className="num font-display text-lg font-bold text-white">{vnd(vatResult.vatPayable)}</p>
                  </div>
                </div>
                <p className="num mt-3 text-xs text-muted-foreground">{vatResult.formula}</p>
              </>
            ) : null}
          </Panel>
        </TabsContent>

        {/* ---------------- TNDN ---------------- */}
        <TabsContent value="tndn" className="mt-4">
          <Panel
            title="Thuế thu nhập doanh nghiệp (TNDN)"
            description="Áp dụng khung ưu đãi theo quy mô doanh thu SMEs"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Năm tính thuế">
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="2000"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={handleCit}
                  disabled={!canCalculate || busy === "cit"}
                >
                  {busy === "cit" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                  Tính thuế TNDN
                </Button>
              </div>
            </div>

            {citResult ? (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    ["Doanh thu thuần", citResult.totalRevenue],
                    ["Giá vốn hàng bán (COGS)", -citResult.totalCOGS],
                    ["Thu nhập tính thuế", citResult.taxableIncome],
                    [`Thuế TNDN (${citResult.taxRate})`, citResult.citAmount],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-border pb-2"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="num font-medium">{vnd(value)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {CIT_TIERS.map((tier) => (
                    <div
                      key={tier.rate}
                      className={
                        citResult.taxRate === `${tier.rate}%`
                          ? "rounded-xl border-2 border-primary bg-primary/10 shadow-sm p-4"
                          : "rounded-xl border border-border p-4"
                      }
                    >
                      <p className="font-display text-2xl font-bold">{tier.rate}%</p>
                      <p className="text-xs text-muted-foreground">{tier.label}</p>
                      <p className="num mt-1 text-xs text-muted-foreground">
                        Thuế: {vnd((citResult.taxableIncome * tier.rate) / 100)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="num mt-3 text-xs text-muted-foreground">{citResult.formula}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Bấm “Tính thuế TNDN” để tổng hợp doanh thu và giá vốn cả năm từ chứng từ đã phát sinh.
              </p>
            )}
          </Panel>
        </TabsContent>

        {/* ---------------- Tờ khai XML ---------------- */}
        <TabsContent value="xml" className="mt-4">
          <Panel
            title="Xuất tờ khai XML & lịch sử kê khai"
            description="Định dạng chuẩn Tổng cục Thuế — tải lên thuedientu.gdt.gov.vn"
            bodyClassName="p-0"
            actions={
              canCalculate ? (
                <Button size="sm" onClick={handleExportXml} disabled={busy === "xml"}>
                  {busy === "xml" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileCode2 className="size-4" />
                  )}
                  ToKhaiThue_Q{quarter}_{year}.xml
                </Button>
              ) : null
            }
          >
            {records.loading ? (
              <LoadingBlock />
            ) : records.error ? (
              <ErrorBlock message={records.error} onRetry={records.reload} />
            ) : (
              <DataTable
                head={["Kỳ tính thuế", "Loại thuế", "Chu kỳ", "Đầu ra", "Đầu vào", "Số phải nộp"]}
              >
                {rows.length === 0 ? (
                  <EmptyRow
                    colSpan={6}
                    message="Chưa có bản ghi kê khai thuế"
                    hint="Tính thuế khoán, GTGT hoặc TNDN để lưu lại lịch sử kê khai."
                  />
                ) : (
                  rows.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50">
                      <Td className="font-semibold">{taxPeriodLabel(record)}</Td>
                      <Td>
                        <Pill tone={record.taxType === "cit" ? "gold" : "info"}>
                          {taxTypeLabels[record.taxType] || record.taxType}
                        </Pill>
                      </Td>
                      <Td className="text-muted-foreground">
                        {periodTypeLabels[record.periodType] || record.periodType}
                      </Td>
                      <Td className="num">{record.vatOutput ? vnd(record.vatOutput) : "—"}</Td>
                      <Td className="num">{record.vatInput ? vnd(record.vatInput) : "—"}</Td>
                      <Td className="num font-semibold">{vnd(record.taxAmount)}</Td>
                    </tr>
                  ))
                )}
              </DataTable>
            )}
          </Panel>

          {xml ? (
            <Panel className="mt-5" title="Nội dung tờ khai vừa sinh">
              <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-4 text-xs">
                {xml}
              </pre>
              <p className="num mt-2 text-xs text-muted-foreground">
                Tổng {num(xml.length)} ký tự
              </p>
            </Panel>
          ) : null}
        </TabsContent>
      </Tabs>
    </>
  );
}
