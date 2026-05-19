import { subscribeLiveEvents } from "@/lib/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let stop: () => void = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(": unitrak connected\n\n"));

      stop = await subscribeLiveEvents((event) => {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
        );
      });

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        stop();
        controller.close();
      });
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
