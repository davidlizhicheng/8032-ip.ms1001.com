import { NextResponse } from "next/server";
import { getActiveProvider, isAIConfigured, getAIModel } from "@/lib/ai/providers";
import { callAIText } from "@/lib/ai/client";

export async function GET() {
  const provider = getActiveProvider();
  const configured = isAIConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      provider,
      message: "未配置 AI API，当前使用 mock 数据",
    });
  }

  try {
    const reply = await callAIText(
      "你是助手，只回复 OK",
      "回复 OK",
    );
    return NextResponse.json({
      configured: true,
      provider,
      model: getAIModel(),
      status: "connected",
      test: reply.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      provider,
      model: getAIModel(),
      status: "error",
      message: error instanceof Error ? error.message : "连接失败",
    });
  }
}
