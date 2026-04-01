import { NextRequest } from "next/server";
import { Compliance } from "../../../compliance/[...path]/route";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}
