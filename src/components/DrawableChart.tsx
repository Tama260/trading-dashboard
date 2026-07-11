"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";

type DrawableChartProps = {
  symbol: string; // contoh: "BTCUSDT"
  interval?: string; // contoh: "1h", "15m", "1d"
  annotations?: Annotation[]; // level otomatis dari setup detection engine
};

// Anotasi otomatis (bukan gambar manual user) — garis horizontal untuk
// level harga (resistance, SL, TP) atau zona (entry zone). Posisinya
// dihitung ulang dari HARGA, bukan disimpan sebagai pixel, jadi otomatis
// tetap benar walau chart di-pan/zoom, dan otomatis update kalau harga
// levelnya berubah (misal saat data live baru masuk).
export type Annotation =
  | { type: "hline"; price: number; label: string; color: string }
  | {
      type: "zone";
      priceLow: number;
      priceHigh: number;
      label: string;
      color: string;
    }
  | { type: "label"; time: number; price: number; text: string; color: string };

// Titik dalam RUANG DATA (harga & waktu), bukan pixel layar. Ini kuncinya:
// karena disimpan sebagai harga & waktu, gambar akan otomatis "ikut"
// posisi yang benar walau chart di-pan atau di-zoom, sebab kita hitung
// ulang posisi pixel-nya setiap kali render.
type DataPoint = { time: UTCTimestamp; price: number };
type PixelPoint = { x: number; y: number };

type Shape =
  | { id: string; type: "line"; points: [DataPoint, DataPoint] }
  | { id: string; type: "rect"; points: [DataPoint, DataPoint] }
  | { id: string; type: "freehand"; points: DataPoint[] };

type Tool = "pointer" | "line" | "rect" | "freehand";

const DRAW_COLOR = "#38bdf8";

function parseIntervalSeconds(interval: string): number {
  const match = interval.match(/^(\d+)([mhd])$/);
  if (!match) return 3600;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multiplier = unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return value * multiplier;
}

// Data demo (random walk) — HANYA dipakai sebagai fallback kalau data live
// Binance gagal dimuat, supaya chart tetap punya skala harga & waktu yang
// valid dan fitur gambar bisa tetap dites. Ini bukan data sungguhan.
function generateMockKlines(interval: string, count = 200) {
  const stepSeconds = parseIntervalSeconds(interval);
  const now = Math.floor(Date.now() / 1000);
  let price = 100;
  const result: {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
  }[] = [];

  for (let i = count; i > 0; i--) {
    const time = (now - i * stepSeconds) as UTCTimestamp;
    const open = price;
    const change = (Math.random() - 0.5) * 2;
    const close = Math.max(1, open + change);
    const high = Math.max(open, close) + Math.random();
    const low = Math.max(0.01, Math.min(open, close) - Math.random());
    result.push({ time, open, high, low, close });
    price = close;
  }
  return result;
}

export default function DrawableChart({
  symbol,
  interval = "1h",
  annotations = [],
}: DrawableChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const annotationsRef = useRef<Annotation[]>(annotations);

  const [tool, setTool] = useState<Tool>("pointer");
  const toolRef = useRef<Tool>("pointer");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  const drawingRef = useRef<Shape | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "demo">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Konversi titik data (harga & waktu) -> posisi pixel di canvas saat ini.
  // Mengembalikan null kalau titik itu sedang di luar area yang terlihat.
  const dataToPixel = useCallback((point: DataPoint): PixelPoint | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;

    const x = chart.timeScale().timeToCoordinate(point.time);
    const y = series.priceToCoordinate(point.price);
    if (x === null || y === null) return null;
    return { x, y };
  }, []);

  // Kebalikannya: posisi pixel mouse -> titik data (harga & waktu).
  // Dipakai saat user menggambar, supaya yang TERSIMPAN adalah data,
  // bukan pixel.
  const pixelToData = useCallback((pixel: PixelPoint): DataPoint | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;

    const time = chart.timeScale().coordinateToTime(pixel.x);
    const price = series.coordinateToPrice(pixel.y);
    if (time === null || price === null) return null;
    return { time: time as UTCTimestamp, price };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = DRAW_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const allShapes = drawingRef.current
      ? [...shapesRef.current, drawingRef.current]
      : shapesRef.current;

    for (const shape of allShapes) {
      if (shape.type === "line") {
        const p1 = dataToPixel(shape.points[0]);
        const p2 = dataToPixel(shape.points[1]);
        if (!p1 || !p2) continue; // salah satu titik di luar layar, skip
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (shape.type === "rect") {
        const p1 = dataToPixel(shape.points[0]);
        const p2 = dataToPixel(shape.points[1]);
        if (!p1 || !p2) continue;
        ctx.strokeRect(
          Math.min(p1.x, p2.x),
          Math.min(p1.y, p2.y),
          Math.abs(p2.x - p1.x),
          Math.abs(p2.y - p1.y)
        );
      } else if (shape.type === "freehand") {
        const pixelPoints = shape.points
          .map(dataToPixel)
          .filter((p): p is PixelPoint => p !== null);
        if (pixelPoints.length < 2) continue;
        ctx.beginPath();
        pixelPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    }

    // Gambar anotasi otomatis dari setup detection engine (garis level &
    // zona entry). Ini terpisah dari shape manual user, jadi tidak ikut
    // terhapus saat "Hapus Semua" ditekan.
    const series = seriesRef.current;
    if (series) {
      // PASS 1: gambar semua GARIS dulu (posisinya harus presisi di harga
      // aslinya, tidak boleh digeser)
      const hlineLabels: { y: number; text: string; color: string }[] = [];

      for (const ann of annotationsRef.current) {
        if (ann.type === "hline") {
          const y = series.priceToCoordinate(ann.price);
          if (y === null) continue;

          ctx.save();
          ctx.strokeStyle = ann.color;
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
          ctx.restore();

          // Simpan dulu, JANGAN gambar teksnya sekarang — kita atur
          // posisinya di PASS 2 supaya tidak saling tumpang tindih
          hlineLabels.push({
            y,
            text: `${ann.label} ${ann.price.toFixed(2)}`,
            color: ann.color,
          });
        } else if (ann.type === "zone") {
          const yLow = series.priceToCoordinate(ann.priceLow);
          const yHigh = series.priceToCoordinate(ann.priceHigh);
          if (yLow === null || yHigh === null) continue;

          ctx.save();
          ctx.fillStyle = `${ann.color}22`; // transparansi ringan
          ctx.fillRect(
            0,
            Math.min(yLow, yHigh),
            canvas.width,
            Math.abs(yLow - yHigh)
          );
          ctx.restore();

          // Sama seperti hline — label-nya JANGAN digambar sekarang,
          // masukkan ke antrian PASS 2 supaya ikut diatur biar tidak
          // tumpang tindih dengan label garis lain di dekatnya
          hlineLabels.push({
            y: Math.min(yLow, yHigh) + 8,
            text: ann.label,
            color: ann.color,
          });
        } else if (ann.type === "label") {
          const point = dataToPixel({
            time: ann.time as UTCTimestamp,
            price: ann.price,
          });
          if (!point) continue;

          ctx.save();
          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(ann.text, point.x, point.y - 8);
          ctx.textAlign = "left";
          ctx.restore();
        }
      }

      // PASS 2: sekarang gambar teks label untuk semua garis hline,
      // diurutkan dari atas ke bawah. Kalau jaraknya kurang dari 12px dari
      // label sebelumnya, geser sedikit ke bawah supaya tidak tumpang tindih.
      hlineLabels.sort((a, b) => a.y - b.y);
      let lastLabelY = -Infinity;
      const minGap = 12;

      for (const item of hlineLabels) {
        let labelY = item.y - 4;
        if (labelY - lastLabelY < minGap) {
          labelY = lastLabelY + minGap;
        }
        lastLabelY = labelY;

        ctx.save();
        ctx.fillStyle = item.color;
        ctx.font = "11px sans-serif";
        ctx.fillText(item.text, 8, labelY);
        ctx.restore();
      }
    }
  }, [dataToPixel]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#a3a3a3" },
      grid: {
        vertLines: { color: "#262626" },
        horzLines: { color: "#262626" },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Ini titik krusial Fase 2.5: setiap kali area yang terlihat berubah
    // (pan/zoom), kita panggil redraw() supaya gambar kita dihitung ulang
    // posisi pixel-nya dari data harga/waktu yang tersimpan.
    chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    chart.timeScale().subscribeSizeChange(redraw);

    async function loadData() {
      try {
        setStatus("loading");
        const res = await fetch(
          `/api/klines?symbol=${symbol}&interval=${interval}&limit=200`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal ambil data");

        const formatted = (
          json as {
            time: number;
            open: number;
            high: number;
            low: number;
            close: number;
          }[]
        ).map((k) => ({
          time: k.time as UTCTimestamp,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));

        series.setData(formatted);
        chart.timeScale().fitContent();
        setStatus("ready");
        redraw();
      } catch (err) {
        // Live data gagal (misal masih soal blokir ISP ke Binance) —
        // fallback ke data demo supaya chart tetap punya skala harga/waktu
        // yang valid, dan fitur gambar tetap bisa dites.
        const mock = generateMockKlines(interval);
        series.setData(mock);
        chart.timeScale().fitContent();
        setStatus("demo");
        setErrorMsg(err instanceof Error ? err.message : "Data live gagal dimuat");
        redraw();
      }
    }

    loadData();

    return () => {
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  useEffect(() => {
    const container = chartContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resizeCanvas() {
      if (!container || !canvas) return;
      const { clientWidth, clientHeight } = container;
      // Kalau ukurannya masih 0 (container belum selesai di-layout oleh
      // browser), jangan set dulu — tunggu observer memanggil ulang saat
      // ukuran sungguhan sudah tersedia.
      if (clientWidth === 0 || clientHeight === 0) return;
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      redraw();
    }

    resizeCanvas();

    // ResizeObserver mendeteksi PERUBAHAN UKURAN CONTAINER kapan saja
    // terjadi (termasuk dari 0 ke ukuran asli saat pertama kali di-layout),
    // bukan cuma saat window di-resize manual. Ini yang menyelesaikan bug:
    // sebelumnya canvas bisa "terjebak" di ukuran 0 selamanya.
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    return () => observer.disconnect();
  }, [redraw]);

  // Redraw juga setiap shapes atau annotations berubah (misal setelah
  // Hapus Semua, atau setup detection engine mengirim level baru)
  useEffect(() => {
    redraw();
  }, [shapes, annotations, redraw]);

  // PENTING: handler ini dipasang manual lewat addEventListener() native,
  // BUKAN lewat prop onMouseDown/onMouseMove React. Ini untuk menghindari
  // kemungkinan event mouse "dicegat" duluan oleh listener lain (misalnya
  // dari library chart) sebelum sampai ke sistem synthetic event React.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getPixel(e: MouseEvent): PixelPoint {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onDown(e: MouseEvent) {
      if (toolRef.current === "pointer") return;
      const point = pixelToData(getPixel(e));
      if (!point) return;

      const id = `${Date.now()}`;
      const tool = toolRef.current;
      if (tool === "line") {
        drawingRef.current = { id, type: "line", points: [point, point] };
      } else if (tool === "rect") {
        drawingRef.current = { id, type: "rect", points: [point, point] };
      } else if (tool === "freehand") {
        drawingRef.current = { id, type: "freehand", points: [point] };
      }
      redraw();
    }

    function onMove(e: MouseEvent) {
      const pixel = getPixel(e);
      const point = pixelToData(pixel);

      // DEBUG SEMENTARA — akan dihapus setelah bug ketemu
      setDebugInfo(
        `tool=${toolRef.current} | pixel=(${pixel.x.toFixed(
          0
        )},${pixel.y.toFixed(0)}) | canvas=${canvas!.width}x${canvas!.height} | ` +
          `data=${point ? `t${point.time} p${point.price.toFixed(2)}` : "NULL"} | ` +
          `drawing=${drawingRef.current ? "aktif" : "kosong"} | shapes=${shapesRef.current.length}`
      );

      if (toolRef.current === "pointer" || !drawingRef.current || !point) return;

      const current = drawingRef.current;
      if (current.type === "freehand") {
        current.points.push(point);
      } else {
        current.points[1] = point;
      }
      redraw();
    }

    function onUp() {
      if (toolRef.current === "pointer" || !drawingRef.current) return;
      const finished = drawingRef.current;
      drawingRef.current = null;
      setShapes((prev) => [...prev, finished]);
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
    };
  }, [pixelToData, redraw]);

  function handleClear() {
    setShapes([]);
    drawingRef.current = null;
    redraw();
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1 flex-wrap">
        <ToolButton
          active={tool === "pointer"}
          onClick={() => setTool("pointer")}
          label="Pointer"
        />
        <ToolButton
          active={tool === "line"}
          onClick={() => setTool("line")}
          label="Garis"
        />
        <ToolButton
          active={tool === "rect"}
          onClick={() => setTool("rect")}
          label="Kotak"
        />
        <ToolButton
          active={tool === "freehand"}
          onClick={() => setTool("freehand")}
          label="Coret Bebas"
        />
        <button
          onClick={handleClear}
          className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-400 hover:bg-red-900 hover:text-red-300 transition-colors ml-auto"
        >
          Hapus Semua
        </button>
      </div>

      <div className="relative w-full h-[500px]">
        {tool !== "pointer" && (
          <div className="absolute top-0 left-0 right-0 z-10 text-[10px] font-mono bg-black/80 text-lime-400 px-2 py-1 pointer-events-none break-all">
            DEBUG: {debugInfo || "gerakkan mouse di atas chart..."}
          </div>
        )}
        <div ref={chartContainerRef} className="absolute inset-0" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            pointerEvents: tool === "pointer" ? "none" : "auto",
            // z-index eksplisit WAJIB lebih tinggi dari z-index:2 yang
            // dipakai lightweight-charts untuk canvas internalnya sendiri —
            // kalau tidak, klik kita akan "ketangkap" duluan oleh chart,
            // meski secara DOM canvas kita ditulis belakangan.
            zIndex: 10,
            cursor:
              tool === "pointer"
                ? "default"
                : tool === "freehand"
                ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='%2338bdf8' stroke='%23000' stroke-width='0.5' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/></svg>") 2 22, crosshair`
                : "crosshair",
          }}
        />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm bg-neutral-900/60 pointer-events-none">
            Memuat data chart...
          </div>
        )}
        {status === "demo" && (
          <div className="absolute top-2 left-2 text-xs bg-yellow-900/90 text-yellow-300 px-3 py-1.5 rounded-md pointer-events-none max-w-[80%]">
            ⚠ Data demo (live gagal: {errorMsg}) — fitur gambar tetap bisa
            dites
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-sky-900 text-sky-300"
          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}
