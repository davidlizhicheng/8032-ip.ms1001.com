import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage/upload";
import {
  AuthError,
  authErrorResponse,
  requireBrandUpgrade,
} from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const uploadIndex = Number(formData.get("uploadIndex") || 0);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
    }

    // 第 2 张及以后需登录 + 品牌升级（¥500）；开发环境 DEV_MOCK_PAYMENT=true 时跳过
    if (uploadIndex >= 1 && process.env.DEV_MOCK_PAYMENT !== "true") {
      await requireBrandUpgrade(request);
    }

    const url = await uploadImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 },
    );
  }
}
