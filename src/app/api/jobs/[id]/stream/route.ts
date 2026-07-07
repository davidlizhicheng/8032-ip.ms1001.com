import { NextRequest } from "next/server";
import { formatSse, getJobEventBuffer, subscribeJobEvents } from "@/lib/agents/stream-events";

type Props = { params: Promise<{ id: string }> };

/**
 * SSE 流式输出：订阅任务进度
 * GET /api/jobs/:id/stream
 */
export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const jobKey = request.nextUrl.searchParams.get("itemId") || id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      for (const event of getJobEventBuffer(jobKey)) {
        send(formatSse(event));
      }

      const unsub = subscribeJobEvents(jobKey, (event) => {
        send(formatSse(event));
        if (event.type === "done" || event.type === "error") {
          unsub();
          controller.close();
        }
      });

      const heartbeat = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
